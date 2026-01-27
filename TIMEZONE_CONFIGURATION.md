# HƯỚNG DẪN CẤU HÌNH TIMEZONE

## Các thay đổi đã thực hiện:

### 1. Docker Compose Configuration
- ✅ Thêm `TZ=Asia/Ho_Chi_Minh` cho Backend container
- ✅ Thêm `TZ=Asia/Ho_Chi_Minh` và `PGTZ=Asia/Ho_Chi_Minh` cho PostgreSQL container

### 2. Backend Configuration
- ✅ Thêm `timezone: 'Asia/Ho_Chi_Minh'` vào `database.config.ts`
- ✅ Thêm `timezone: 'Asia/Ho_Chi_Minh'` vào `ormconfig.ts`

### 3. Cách áp dụng:

#### A. Đối với hệ thống mới (chưa deploy):
```bash
cd /home/seth/WorkSpace/SWP/SWP
docker-compose down
docker-compose up -d
```

#### B. Đối với hệ thống đang chạy:

1. **Thiết lập timezone cho database hiện tại:**
```bash
# Copy file SQL vào container
docker cp BackEnd/set-timezone.sql swp-postgres:/tmp/

# Chạy script trong container
docker exec -it swp-postgres psql -U postgres -d fuel_management -f /tmp/set-timezone.sql
```

2. **Restart containers để áp dụng environment variables:**
```bash
docker-compose restart backend
docker-compose restart postgres
```

3. **Kiểm tra timezone đã được thiết lập đúng:**
```bash
# Kiểm tra timezone của PostgreSQL
docker exec -it swp-postgres psql -U postgres -d fuel_management -c "SHOW timezone;"

# Kiểm tra timezone của Backend
docker exec -it swp-backend date
```

## Ảnh hưởng của thay đổi:

### ✅ Lợi ích:
1. **Dữ liệu thời gian nhất quán**: Tất cả timestamp trong database sẽ sử dụng múi giờ Việt Nam
2. **Query chính xác**: Các query so sánh ngày (`BETWEEN`, `>=`, `<=`) sẽ hoạt động đúng
3. **Log rõ ràng**: Thời gian trong log sẽ hiển thị theo giờ Việt Nam
4. **Báo cáo đúng**: Các báo cáo theo ngày/tháng sẽ chính xác

### ⚠️ Lưu ý:
1. **Dữ liệu cũ**: Dữ liệu đã lưu trước đây vẫn giữ nguyên giá trị, chỉ cách hiển thị thay đổi
2. **Không cần migrate**: Không cần chạy migration vì chỉ thay đổi cách PostgreSQL xử lý timezone
3. **Restart cần thiết**: Phải restart containers để áp dụng environment variables

## Kiểm tra sau khi cấu hình:

```bash
# 1. Kiểm tra timezone PostgreSQL
docker exec -it swp-postgres psql -U postgres -d fuel_management -c "SELECT NOW(), current_setting('timezone');"

# 2. Kiểm tra timezone Backend container
docker exec -it swp-backend sh -c "date && echo \$TZ"

# 3. Test query một record có timestamp
docker exec -it swp-postgres psql -U postgres -d fuel_management -c "SELECT id, created_at FROM shifts LIMIT 1;"
```

Kết quả mong đợi: Thời gian hiển thị phải theo múi giờ Việt Nam (UTC+7).
