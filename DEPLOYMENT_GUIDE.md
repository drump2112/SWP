# 🚀 Hướng Dẫn Deploy Lên Production Server

**Server IP:** `34.126.101.135`
**Environment:** Production
**Method:** Docker + Docker Compose

---

## 📋 Yêu Cầu Tiên Quyết

### Trên Server Linux Của Bạn:

- [x] Docker (version 20.10+)
- [x] Docker Compose (version 1.29+)
- [x] Git (để clone/pull code)
- [x] SSH access để quản lý server

### Cài Đặt Docker Và Docker Compose (Nếu Chưa Có)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (optional, để không cần sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

---

## 🔧 Chuẩn Bị Trước Deploy

### 1. Cấu Hình Environment Variables

Tạo file `.env` trong thư mục root project (nếu chưa có):

```bash
# FrontEnd/.env.production
VITE_API_URL=http://34.126.101.135:3000/api
VITE_APP_NAME=SWP
NODE_ENV=production
```

```bash
# BackEnd/.env (hoặc cấu hình trong docker-compose.yml)
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_strong_password_here  # ⚠️ Đổi password mạnh!
DB_DATABASE=fuel_management
TZ=Asia/Ho_Chi_Minh
JWT_SECRET=your_jwt_secret_key_here  # ⚠️ Tạo secret key mạnh!
```

### 2. Database Backup (Nếu Upgrading)

```bash
# Backup database hiện tại (nếu server đã chạy trước đó)
docker exec swp-postgres pg_dump -U postgres fuel_management > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 📦 Deploy Steps

### Option A: Deploy Lần Đầu

```bash
# 1. SSH vào server
ssh -i your-key.pem user@34.126.101.135

# 2. Clone/download project code
git clone your-repo-url /opt/swp
cd /opt/swp

# 3. Tạo ssl directory (nếu dùng HTTPS)
mkdir -p ssl

# 4. Build và start containers
docker-compose up -d --build

# 5. Check status
docker-compose ps

# 6. View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Option B: Update Code (Redeploy)

```bash
cd /opt/swp

# 1. Pull latest code
git pull origin main

# 2. Rebuild images
docker-compose build --no-cache

# 3. Restart services
docker-compose up -d

# 4. Verify
docker-compose logs -f
```

### Option C: Zero-Downtime Update

```bash
cd /opt/swp

# 1. Pull code
git pull origin main

# 2. Build new images
docker-compose build

# 3. Gracefully stop và start (container replacement)
docker-compose up -d --no-deps --build backend
docker-compose up -d --no-deps --build frontend

# 4. Cleanup old images (optional)
docker image prune -a
```

---

## 🔐 Security Configuration

### 1. Setup SSL Certificate (HTTPS)

#### Using Let's Encrypt + Certbot:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate (replace your-domain.com)
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to ssl directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/swp/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/swp/ssl/key.pem
sudo chown 1000:1000 /opt/swp/ssl/*
```

#### Update nginx.conf để sử dụng HTTPS:

Uncomment HTTPS server block trong `FrontEnd/nginx.conf` và update paths.

### 2. Database Security

```bash
# Login vào PostgreSQL
docker exec -it swp-postgres psql -U postgres

# Change default password
ALTER USER postgres WITH PASSWORD 'your_new_strong_password';

# Exit
\q
```

### 3. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 4. Update docker-compose.yml Sensitive Data

**❌ KHÔNG** commit password vào Git!

```yaml
# Sử dụng environment file thay vì hardcode
backend:
  environment:
    - DB_PASSWORD=${DB_PASSWORD}
    - JWT_SECRET=${JWT_SECRET}
```

Tạo `.env` file ở server:

```bash
DB_PASSWORD=your_strong_password
JWT_SECRET=your_jwt_secret_key
```

---

## 📊 Monitoring & Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Health Check

```bash
# Check if services running
docker-compose ps

# Test API
curl http://34.126.101.135:3000/api/health

# Test Frontend
curl http://34.126.101.135/health
```

### Database Backup (Automated)

```bash
# Create backup script
cat > /opt/swp/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/swp/backups"
mkdir -p $BACKUP_DIR
docker exec swp-postgres pg_dump -U postgres fuel_management | gzip > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Keep only last 7 backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/swp/backup.sh

# Schedule daily backup at 2 AM
crontab -e
# Add: 0 2 * * * /opt/swp/backup.sh
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

### Stop/Start Services

```bash
# Stop
docker-compose down

# Start again
docker-compose up -d
```

---

## 🐛 Troubleshooting

### Container không start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild from scratch
docker-compose down -v
docker-compose up -d --build
```

### Database connection error

```bash
# Check if postgres running
docker exec swp-postgres psql -U postgres -c "SELECT 1"

# Reset database
docker-compose down -v
docker-compose up -d postgres
docker-compose exec postgres psql -U postgres -f /docker-entrypoint-initdb.d/01-schema.sql
```

### Port conflicts

```bash
# Check port usage
sudo netstat -tlnp | grep 3000
sudo netstat -tlnp | grep 80

# Change ports in docker-compose.yml if needed
```

### Memory/Disk issues

```bash
# Check disk space
df -h

# Cleanup old images/containers
docker system prune -a

# Check Docker usage
docker stats
```

---

## ✅ Verification Checklist

- [ ] Docker & Docker Compose installed
- [ ] Code cloned to `/opt/swp`
- [ ] `.env` files configured (passwords changed)
- [ ] `nginx.conf` exists in FrontEnd folder
- [ ] SSL certificates setup (if using HTTPS)
- [ ] `docker-compose up -d` runs successfully
- [ ] All containers running: `docker-compose ps`
- [ ] Backend API responding: `curl http://34.126.101.135:3000/api/health`
- [ ] Frontend accessible: `http://34.126.101.135`
- [ ] Database initialized: `docker exec swp-postgres psql -U postgres -l`
- [ ] Firewall configured
- [ ] Backup script setup
- [ ] Monitoring logs working

---

## 📞 Next Steps

1. **Setup Monitoring**: Consider using Portainer, Prometheus, or Grafana
2. **Setup CI/CD**: Automate deployment with GitHub Actions or GitLab CI
3. **Setup Alerts**: Configure alerts for container failures
4. **Domain Setup**: Point your domain to `34.126.101.135`
5. **Performance Tuning**: Optimize Docker resources, database queries, etc.

---

**Last Updated:** 2026-04-24
