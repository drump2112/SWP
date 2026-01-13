# Hướng dẫn Build và Deploy Docker Image

## 📋 Tổng quan

Dự án được containerize với 3 services chính:
- **PostgreSQL**: Database
- **Backend**: NestJS API (Node.js)
- **Frontend**: React + Vite (Nginx)

## 🚀 Cách 1: Deploy với Docker Compose (Khuyến nghị)

### Build và chạy tất cả services

```bash
# Build và start tất cả services
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Xem logs của service cụ thể
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop tất cả services
docker-compose down

# Stop và xóa volumes (reset database)
docker-compose down -v
```

### Truy cập ứng dụng

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432

## 🐋 Cách 2: Build Image riêng lẻ để deploy

### 2.1. Build Backend Image

```bash
cd BackEnd

# Build image
docker build -t fuel-backend:latest .

# Hoặc với tag cụ thể
docker build -t fuel-backend:v1.0.0 .

# Push lên Docker Hub (optional)
docker tag fuel-backend:latest yourusername/fuel-backend:latest
docker push yourusername/fuel-backend:latest

# Chạy container
docker run -d \
  --name fuel-backend \
  -p 3000:3000 \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=123456 \
  -e DB_DATABASE=fuel_management \
  -e JWT_SECRET=your-secret-key \
  fuel-backend:latest
```

### 2.2. Build Frontend Image

```bash
cd FrontEnd

# Build image
docker build -t fuel-frontend:latest .

# Hoặc với tag cụ thể
docker build -t fuel-frontend:v1.0.0 .

# Push lên Docker Hub (optional)
docker tag fuel-frontend:latest yourusername/fuel-frontend:latest
docker push yourusername/fuel-frontend:latest

# Chạy container
docker run -d \
  --name fuel-frontend \
  -p 80:80 \
  fuel-frontend:latest
```

## 🌐 Deploy lên Server

### Option 1: Sử dụng Docker Compose trên server

```bash
# 1. Copy toàn bộ project lên server
scp -r /path/to/SWP user@server:/path/to/deploy

# 2. SSH vào server
ssh user@server

# 3. Chạy docker-compose
cd /path/to/deploy/SWP
docker-compose up -d --build
```

### Option 2: Sử dụng Docker Hub

```bash
# Trên máy local: Build và push images
docker-compose build
docker tag swp-backend:latest yourusername/fuel-backend:latest
docker tag swp-frontend:latest yourusername/fuel-frontend:latest
docker push yourusername/fuel-backend:latest
docker push yourusername/fuel-frontend:latest

# Trên server: Pull và run
docker pull yourusername/fuel-backend:latest
docker pull yourusername/fuel-frontend:latest
docker-compose up -d
```

### Option 3: Sử dụng Private Registry

```bash
# Setup private registry
docker run -d -p 5000:5000 --name registry registry:2

# Tag và push
docker tag fuel-backend:latest your-registry.com:5000/fuel-backend:latest
docker push your-registry.com:5000/fuel-backend:latest

# Trên server: Pull và run
docker pull your-registry.com:5000/fuel-backend:latest
```

## ⚙️ Environment Variables

### Backend Environment Variables

Tạo file `.env` trong thư mục `BackEnd`:

```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password
DB_DATABASE=fuel_management

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# CORS (nếu cần)
CORS_ORIGIN=http://your-domain.com
```

### Frontend Environment Variables

Tạo file `.env.production` trong thư mục `FrontEnd`:

```env
VITE_API_URL=http://your-backend-api.com:3000
```

Sau đó cập nhật Dockerfile của Frontend để copy file này:

```dockerfile
# Trong FrontEnd/Dockerfile
COPY .env.production .env.production
```

## 🔧 Cấu hình Production

### 1. Bảo mật Database

Sửa file `docker-compose.yml`:

```yaml
postgres:
  environment:
    POSTGRES_PASSWORD: ${DB_PASSWORD:-change-this-password}
```

### 2. Cấu hình Nginx Reverse Proxy

Tạo file `nginx-proxy.conf`:

```nginx
upstream backend {
    server backend:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://frontend;
    }
}
```

### 3. SSL/HTTPS với Let's Encrypt

```bash
# Cài đặt certbot
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  certbot/certbot certonly \
  --standalone \
  -d your-domain.com
```

## 📊 Monitoring và Logs

```bash
# Xem trạng thái containers
docker-compose ps

# Xem resource usage
docker stats

# Xem logs realtime
docker-compose logs -f --tail=100

# Backup database
docker exec fuel-postgres pg_dump -U postgres fuel_management > backup.sql

# Restore database
docker exec -i fuel-postgres psql -U postgres fuel_management < backup.sql
```

## 🔄 Update và Rollback

### Update application

```bash
# Pull latest code
git pull origin main

# Rebuild và restart
docker-compose up -d --build

# Hoặc chỉ rebuild service cụ thể
docker-compose up -d --build backend
```

### Rollback

```bash
# Quay về commit trước
git checkout previous-commit-hash

# Rebuild
docker-compose up -d --build
```

## 🐛 Troubleshooting

### Container không start

```bash
# Xem logs chi tiết
docker-compose logs backend

# Kiểm tra cấu hình
docker-compose config

# Restart service
docker-compose restart backend
```

### Database connection issues

```bash
# Kiểm tra database có chạy không
docker-compose ps postgres

# Kiểm tra network
docker network inspect swp_fuel-network

# Test connection từ backend
docker-compose exec backend ping postgres
```

### Clear cache và rebuild

```bash
# Xóa tất cả và rebuild từ đầu
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

## 📝 Checklist trước khi deploy

- [ ] Đổi tất cả passwords mặc định
- [ ] Cấu hình environment variables production
- [ ] Setup backup tự động cho database
- [ ] Cấu hình SSL/HTTPS
- [ ] Setup monitoring và alerting
- [ ] Test migration database
- [ ] Cấu hình CORS đúng domain
- [ ] Setup log rotation
- [ ] Cấu hình firewall cho các ports cần thiết

## 🎯 Best Practices

1. **Không hardcode secrets** - Sử dụng environment variables
2. **Tag images với version** - Dễ rollback
3. **Multi-stage builds** - Giảm kích thước image
4. **Health checks** - Đảm bảo services healthy
5. **Resource limits** - Tránh container chiếm hết resources
6. **Backup thường xuyên** - Bảo vệ dữ liệu
7. **Monitor logs** - Phát hiện lỗi sớm
8. **Security scanning** - Scan vulnerabilities trong images

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Logs của container: `docker-compose logs -f`
2. Network connectivity: `docker network inspect`
3. Resource usage: `docker stats`
4. Container health: `docker-compose ps`
