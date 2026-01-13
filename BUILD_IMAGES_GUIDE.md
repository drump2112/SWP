# 🐳 Hướng dẫn Build và Gửi Docker Images

## 📋 Tổng quan

Có 2 cách để gửi Docker images cho đồng nghiệp:

### **Cách 1: Qua Docker Hub** (Khuyến nghị - Nhanh và tiện)
- ✅ Tốc độ nhanh
- ✅ Không giới hạn kích thước
- ✅ Dễ chia sẻ
- ❌ Cần tài khoản Docker Hub
- ❌ Public (trừ khi trả phí)

### **Cách 2: Gửi file .tar.gz** (Không cần internet)
- ✅ Không cần tài khoản
- ✅ Private hoàn toàn
- ❌ File size lớn (~500MB-1GB)
- ❌ Cần transfer file qua USB/network

---

## 🚀 CÁCH 1: Dùng Docker Hub

### Bước 1: Build images (Trên máy của bạn)

```bash
# Build tất cả images với version
./build-images.sh v1.0.0

# Hoặc build với tag latest
./build-images.sh latest
```

### Bước 2: Push lên Docker Hub (Trên máy của bạn)

```bash
# Login Docker Hub (lần đầu tiên)
docker login

# Push images lên Docker Hub
./push-images.sh your-dockerhub-username v1.0.0

# Ví dụ:
./push-images.sh sethvu v1.0.0
```

### Bước 3: Gửi cho đồng nghiệp

Gửi 2 file này:
- `docker-compose.images.yml`
- `.env.example`

Và thông tin:
```
Docker Hub username: your-dockerhub-username
Image version: v1.0.0
```

### Bước 4: Đồng nghiệp pull và chạy

```bash
# Pull images từ Docker Hub
docker pull your-dockerhub-username/fuel-management-backend:v1.0.0
docker pull your-dockerhub-username/fuel-management-frontend:v1.0.0
docker pull postgres:15

# Hoặc để docker-compose tự pull
docker-compose -f docker-compose.images.yml pull

# Tạo file .env
cp .env.example .env
nano .env  # Sửa config nếu cần

# Chạy
docker-compose -f docker-compose.images.yml up -d

# Xem logs
docker-compose -f docker-compose.images.yml logs -f
```

**Lưu ý:** Nhớ sửa file `docker-compose.images.yml` thay `YOUR_DOCKERHUB_USERNAME` bằng username thật.

---

## 💾 CÁCH 2: Gửi file .tar.gz

### Bước 1: Build images (Trên máy của bạn)

```bash
# Build images
./build-images.sh v1.0.0
```

### Bước 2: Export images thành file (Trên máy của bạn)

```bash
# Export images thành file .tar.gz
./save-images.sh v1.0.0

# Đóng gói tất cả thành 1 file duy nhất
tar -czf fuel-management-v1.0.0.tar.gz \
  docker-images/ \
  docker-compose.images.yml \
  .env.example \
  load-images.sh
```

Kết quả: File `fuel-management-v1.0.0.tar.gz` (~500MB-1GB)

### Bước 3: Gửi file cho đồng nghiệp

Gửi qua:
- USB/External drive
- Google Drive / Dropbox
- Network share
- SCP: `scp fuel-management-v1.0.0.tar.gz user@server:/path/`

### Bước 4: Đồng nghiệp giải nén và load (Trên máy đồng nghiệp)

```bash
# Giải nén
tar -xzf fuel-management-v1.0.0.tar.gz

# Load images vào Docker
./load-images.sh v1.0.0

# Tạo file .env
cp .env.example .env
nano .env  # Sửa config nếu cần

# Chạy
docker-compose -f docker-compose.images.yml up -d

# Xem logs
docker-compose -f docker-compose.images.yml logs -f
```

---

## 📦 So sánh kích thước

Dự kiến kích thước images:

```
Backend image:   ~200-300 MB
Frontend image:  ~50-80 MB
Postgres image:  ~150-200 MB
-----------------------------
Total:           ~400-600 MB (compressed)
```

---

## 🔧 Commands Reference

### Build và export (Máy của bạn)

```bash
# Build tất cả
./build-images.sh v1.0.0

# Export thành files
./save-images.sh v1.0.0

# Đóng gói để gửi
tar -czf release.tar.gz docker-images/ docker-compose.images.yml .env.example load-images.sh

# Hoặc push lên Docker Hub
./push-images.sh yourusername v1.0.0
```

### Load và chạy (Máy đồng nghiệp)

```bash
# Load từ files
./load-images.sh v1.0.0

# Hoặc pull từ Docker Hub
docker-compose -f docker-compose.images.yml pull

# Setup và chạy
cp .env.example .env
nano .env
docker-compose -f docker-compose.images.yml up -d
```

---

## ✅ Checklist

### Trước khi build:
- [ ] Code đã commit và test kỹ
- [ ] Đã test build local: `./build-images.sh latest`
- [ ] Các environment variables trong `.env.example` đầy đủ

### Trước khi gửi:
- [ ] Images build thành công
- [ ] Đã test chạy từ images: `docker-compose -f docker-compose.images.yml up`
- [ ] File size hợp lý (nếu gửi .tar.gz)
- [ ] Kèm theo hướng dẫn sử dụng

### Đồng nghiệp cần:
- [ ] Docker đã cài đặt
- [ ] Docker Compose đã cài đặt
- [ ] File .env đã cấu hình đúng
- [ ] Ports 80, 3000, 5432 available

---

## 🐛 Troubleshooting

### Images quá lớn?

```bash
# Xem size của từng layer
docker history fuel-management-backend:latest

# Clean up unused layers
docker system prune -a

# Rebuild với --no-cache
docker build --no-cache -t fuel-management-backend:latest BackEnd/
```

### Load image bị lỗi?

```bash
# Kiểm tra file integrity
md5sum docker-images/*.tar.gz

# Load thủ công
gunzip -c docker-images/backend-v1.0.0.tar.gz | docker load

# Xem logs chi tiết
docker load -i docker-images/backend-v1.0.0.tar.gz
```

### Container không start?

```bash
# Xem logs
docker-compose -f docker-compose.images.yml logs backend

# Kiểm tra images
docker images | grep fuel-management

# Kiểm tra environment
docker-compose -f docker-compose.images.yml config
```

---

## 💡 Tips

1. **Tag version đúng cách:**
   ```bash
   # Semantic versioning
   ./build-images.sh v1.0.0    # Release
   ./build-images.sh v1.0.1    # Bug fix
   ./build-images.sh v1.1.0    # New feature
   ./build-images.sh dev       # Development
   ```

2. **Multi-architecture build** (nếu cần chạy trên ARM/Apple Silicon):
   ```bash
   docker buildx build --platform linux/amd64,linux/arm64 -t image:tag .
   ```

3. **Private Registry** (alternative to Docker Hub):
   ```bash
   # Setup local registry
   docker run -d -p 5000:5000 --name registry registry:2

   # Tag và push
   docker tag fuel-management-backend:latest localhost:5000/backend:latest
   docker push localhost:5000/backend:latest
   ```

4. **Compress tốt hơn:**
   ```bash
   # Dùng pigz (parallel gzip) nếu có
   docker save fuel-management-backend:latest | pigz > backend.tar.gz
   ```

---

## 📞 Quick Start cho Đồng nghiệp

**Nếu nhận được file .tar.gz:**
```bash
tar -xzf fuel-management-v1.0.0.tar.gz
./load-images.sh v1.0.0
cp .env.example .env
docker-compose -f docker-compose.images.yml up -d
```

**Nếu nhận được Docker Hub link:**
```bash
# Sửa docker-compose.images.yml với username được cung cấp
nano docker-compose.images.yml
cp .env.example .env
docker-compose -f docker-compose.images.yml up -d
```

Truy cập:
- Frontend: http://localhost
- Backend: http://localhost:3000
