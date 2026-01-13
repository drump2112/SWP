# 🚀 Hướng dẫn Deploy lên Server

## Phương án 1: Deploy với Docker Compose (Khuyến nghị)

### Bước 1: Chuẩn bị file trên máy local

#### 1.1. Tạo file `.env` cho production

**Tạo file `BackEnd/.env.production`:**
```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=MatKhauManh@123
DB_DATABASE=fuel_management

# JWT - ĐỔI MẬT KHẨU NÀY!
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://your-domain.com
```

**Tạo file `FrontEnd/.env.production`:**
```env
VITE_API_URL=http://your-server-ip:3000
# Hoặc nếu dùng domain: https://api.your-domain.com
```

#### 1.2. Cập nhật docker-compose.yml

Tạo file `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: fuel-postgres
    restart: always
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${DB_USERNAME:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-MatKhauManh@123}
      POSTGRES_DB: ${DB_DATABASE:-fuel_management}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - fuel-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./BackEnd
      dockerfile: Dockerfile
    container_name: fuel-backend
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - ./BackEnd/.env.production
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - fuel-network
    volumes:
      - ./BackEnd/uploads:/app/uploads

  frontend:
    build:
      context: ./FrontEnd
      dockerfile: Dockerfile
    container_name: fuel-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - fuel-network

volumes:
  pgdata:

networks:
  fuel-network:
    driver: bridge
```

### Bước 2: Upload lên Server

#### Cách 1: Sử dụng SCP/SFTP

```bash
# Từ máy local, tạo archive
cd /home/seth/WorkSpace/SWP/SWP
tar -czf swp-deploy.tar.gz \
  BackEnd/ \
  FrontEnd/ \
  docker-compose.yml \
  docker-compose.prod.yml \
  .dockerignore \
  --exclude=BackEnd/node_modules \
  --exclude=FrontEnd/node_modules \
  --exclude=BackEnd/dist \
  --exclude=FrontEnd/dist

# Upload lên server
scp swp-deploy.tar.gz user@your-server-ip:/home/user/

# Hoặc dùng rsync (tốt hơn)
rsync -avz --exclude='node_modules' --exclude='dist' \
  /home/seth/WorkSpace/SWP/SWP/ \
  user@your-server-ip:/home/user/swp/
```

#### Cách 2: Sử dụng Git (Khuyến nghị)

```bash
# Trên máy local: Push code lên Git
git add .
git commit -m "Production ready"
git push origin main

# Trên server: Clone repository
ssh user@your-server-ip
cd /home/user
git clone https://github.com/your-username/your-repo.git swp
cd swp
```

### Bước 3: Cài đặt Docker trên Server

```bash
# SSH vào server
ssh user@your-server-ip

# Cài Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cài Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user vào docker group
sudo usermod -aG docker $USER
newgrp docker

# Kiểm tra
docker --version
docker-compose --version
```

### Bước 4: Deploy trên Server

```bash
# SSH vào server
ssh user@your-server-ip

# Di chuyển vào thư mục project
cd /home/user/swp

# Tạo file .env nếu chưa có
nano BackEnd/.env.production
# (Copy nội dung từ bước 1.1)

nano FrontEnd/.env.production
# (Copy nội dung từ bước 1.1)

# Build và start services
docker-compose -f docker-compose.prod.yml up -d --build

# Xem logs
docker-compose -f docker-compose.prod.yml logs -f

# Kiểm tra status
docker-compose -f docker-compose.prod.yml ps
```

### Bước 5: Chạy Migration Database

```bash
# Vào container backend
docker exec -it fuel-backend sh

# Chạy migration
npm run migration:run

# Thoát container
exit
```

### Bước 6: Kiểm tra ứng dụng

```bash
# Kiểm tra backend
curl http://localhost:3000

# Kiểm tra frontend
curl http://localhost:80

# Từ máy khác
curl http://your-server-ip:3000
curl http://your-server-ip:80
```

---

## Phương án 2: Deploy với Docker Images từ Registry

### Bước 1: Build và Push Images lên Docker Hub

**Trên máy local:**

```bash
cd /home/seth/WorkSpace/SWP/SWP

# Login Docker Hub
docker login

# Build images
docker-compose build

# Tag images
docker tag swp-backend:latest yourusername/fuel-backend:v1.0.0
docker tag swp-frontend:latest yourusername/fuel-frontend:v1.0.0

# Push images
docker push yourusername/fuel-backend:v1.0.0
docker push yourusername/fuel-frontend:v1.0.0
```

### Bước 2: Tạo docker-compose.yml đơn giản cho server

**Tạo file `docker-compose.server.yml`:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: fuel-postgres
    restart: always
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: MatKhauManh@123
      POSTGRES_DB: fuel_management
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - fuel-network

  backend:
    image: yourusername/fuel-backend:v1.0.0
    container_name: fuel-backend
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: postgres
      DB_PASSWORD: MatKhauManh@123
      DB_DATABASE: fuel_management
      JWT_SECRET: your-super-secret-jwt-key
      JWT_EXPIRES_IN: 7d
    depends_on:
      - postgres
    networks:
      - fuel-network

  frontend:
    image: yourusername/fuel-frontend:v1.0.0
    container_name: fuel-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - fuel-network

volumes:
  pgdata:

networks:
  fuel-network:
    driver: bridge
```

### Bước 3: Upload file lên server và deploy

```bash
# Upload file docker-compose
scp docker-compose.server.yml user@your-server-ip:/home/user/

# SSH vào server
ssh user@your-server-ip

# Chạy docker-compose
cd /home/user
docker-compose -f docker-compose.server.yml up -d

# Xem logs
docker-compose -f docker-compose.server.yml logs -f
```

---

## 📋 Checklist trước khi Deploy

- [ ] Đã đổi tất cả passwords mặc định
- [ ] Đã cấu hình JWT_SECRET mạnh
- [ ] Đã cập nhật CORS_ORIGIN với domain thật
- [ ] Đã test build trên local: `docker-compose up --build`
- [ ] Đã backup database hiện tại (nếu có)
- [ ] Đã cấu hình firewall mở port 80, 443, 3000 (hoặc chỉ 80, 443 nếu dùng reverse proxy)
- [ ] Đã có tên miền và DNS trỏ về server (nếu dùng domain)
- [ ] Đã chuẩn bị SSL certificate (nếu cần HTTPS)

---

## 🔧 Cấu hình Firewall (UFW - Ubuntu)

```bash
# Trên server
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Backend API (tùy chọn)
sudo ufw enable
sudo ufw status
```

---

## 🔒 Cấu hình HTTPS với Let's Encrypt (Tùy chọn)

### Cách 1: Sử dụng Certbot với Nginx

```bash
# Cài đặt certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Lấy certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renew
sudo certbot renew --dry-run
```

### Cách 2: Tích hợp vào Docker

Tạo `docker-compose.ssl.yml` với Nginx Proxy và Let's Encrypt.

---

## 📊 Monitoring và Maintenance

### Xem logs

```bash
# Tất cả services
docker-compose logs -f

# Service cụ thể
docker-compose logs -f backend
docker-compose logs -f frontend

# 100 dòng cuối
docker-compose logs --tail=100 -f
```

### Backup Database

```bash
# Backup
docker exec fuel-postgres pg_dump -U postgres fuel_management > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i fuel-postgres psql -U postgres fuel_management < backup_20260113.sql
```

### Update Application

```bash
# Pull code mới (nếu dùng git)
git pull origin main

# Rebuild và restart
docker-compose down
docker-compose up -d --build

# Hoặc chỉ rebuild service cụ thể
docker-compose up -d --build backend
```

### Restart Services

```bash
# Restart tất cả
docker-compose restart

# Restart service cụ thể
docker-compose restart backend

# Stop và start lại
docker-compose down
docker-compose up -d
```

---

## 🚨 Troubleshooting

### Container không start

```bash
# Xem logs chi tiết
docker-compose logs backend

# Kiểm tra tài nguyên
docker stats

# Xem processes
docker-compose ps
```

### Database connection failed

```bash
# Kiểm tra postgres
docker-compose ps postgres

# Test connection
docker exec -it fuel-backend ping postgres

# Xem logs postgres
docker-compose logs postgres
```

### Port đã được sử dụng

```bash
# Kiểm tra port đang dùng
sudo netstat -tulpn | grep :80
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

---

## 📝 File cần upload lên server

### Phương án 1 (Build trên server):
```
swp/
├── BackEnd/
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.production
│   └── ...
├── FrontEnd/
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── nginx.conf
│   ├── .env.production
│   └── ...
├── docker-compose.yml (hoặc docker-compose.prod.yml)
└── .dockerignore
```

### Phương án 2 (Dùng registry):
```
swp/
└── docker-compose.server.yml
```

---

## 🎯 Khuyến nghị

1. **Sử dụng Git**: Deploy từ Git repository, dễ quản lý version
2. **Environment files**: Không commit file `.env` vào git, tạo riêng trên server
3. **Backup thường xuyên**: Setup cronjob backup database hàng ngày
4. **Monitoring**: Cài đặt monitoring tools (Prometheus, Grafana)
5. **HTTPS**: Luôn dùng HTTPS cho production
6. **Reverse Proxy**: Dùng Nginx proxy để quản lý traffic tốt hơn
7. **CI/CD**: Setup GitHub Actions hoặc GitLab CI cho auto deployment

---

## 💡 Quick Commands Reference

```bash
# Deploy
docker-compose up -d --build

# Stop
docker-compose down

# Restart
docker-compose restart

# Logs
docker-compose logs -f

# Status
docker-compose ps

# Backup DB
docker exec fuel-postgres pg_dump -U postgres fuel_management > backup.sql

# Update code và redeploy
git pull && docker-compose up -d --build
```
