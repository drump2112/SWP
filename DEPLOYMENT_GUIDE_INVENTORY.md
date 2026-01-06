# Hướng Dẫn Triển Khai - Refactor Nhập Xuất Tồn

## 🚀 Các Bước Triển Khai

### Bước 1: Backup Database
```bash
# Backup toàn bộ database trước khi migrate
mysqldump -u root -p swp_db > backup_before_inventory_refactor_$(date +%Y%m%d_%H%M%S).sql
```

### Bước 2: Pull Code Mới
```bash
cd /home/seth/WorkSpace/SWP/BackEnd
git pull origin main  # hoặc branch của bạn
```

### Bước 3: Install Dependencies (nếu có thay đổi)
```bash
npm install
```

### Bước 4: Chạy Migration
```bash
# Kiểm tra migration sẽ chạy
npm run migration:show

# Chạy migration
npm run migration:run

# Kết quả mong đợi:
# ✅ Đã đánh dấu cột current_stock trong bảng tanks là DEPRECATED
# 📊 Tồn kho bây giờ được tính từ inventory_ledger
```

### Bước 5: Restart Backend
```bash
# Stop backend hiện tại
pm2 stop swp-backend  # hoặc kill process

# Rebuild (nếu TypeScript)
npm run build

# Start lại
npm run start:prod
# hoặc
pm2 restart swp-backend
```

### Bước 6: Kiểm Tra Health Check
```bash
# Kiểm tra API hoạt động
curl http://localhost:3000/health

# Kiểm tra tanks API
curl http://localhost:3000/tanks

# Kết quả phải có currentStock được tính từ ledger
```

## 🧪 Test Cases Sau Khi Deploy

### Test 1: Kiểm Tra Tồn Kho Tanks
```bash
# GET một tank bất kỳ
curl http://localhost:3000/tanks/1

# Kỳ vọng response:
{
  "id": 1,
  "tankCode": "T001",
  "name": "Bồn 1",
  "capacity": 10000,
  "currentStock": 5000,  # <-- Từ ledger, không phải từ DB
  "fillPercentage": 50,
  ...
}
```

### Test 2: Nhập Hàng Mới
```bash
# POST /inventory/documents
curl -X POST http://localhost:3000/inventory/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "storeId": 1,
    "docType": "IMPORT",
    "docDate": "2026-01-06",
    "supplierName": "NCC Test",
    "items": [{
      "productId": 1,
      "tankId": 1,
      "quantity": 1000,
      "unitPrice": 21000
    }]
  }'

# Sau đó check lại tank
curl http://localhost:3000/tanks/1
# currentStock phải TĂNG 1000
```

### Test 3: Bán Hàng (Close Shift)
```bash
# POST /shifts/:id/close
curl -X POST http://localhost:3000/shifts/1/close \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "shiftId": 1,
    "pumpReadings": [{
      "pumpCode": "P001",
      "productId": 1,
      "startValue": 0,
      "endValue": 500
    }]
  }'

# Sau đó check lại tank
curl http://localhost:3000/tanks/1
# currentStock phải GIẢM 500
```

### Test 4: Kiểm Tra Inventory Ledger
```sql
-- Vào MySQL và check ledger
SELECT
  il.id,
  il.ref_type,
  il.quantity_in,
  il.quantity_out,
  il.tank_id,
  t.tank_code,
  p.name as product_name,
  il.created_at
FROM inventory_ledger il
LEFT JOIN tanks t ON t.id = il.tank_id
LEFT JOIN product p ON p.id = il.product_id
WHERE il.tank_id = 1
ORDER BY il.created_at DESC
LIMIT 10;

-- Phải thấy:
-- - IMPORT với quantity_in
-- - SHIFT_SALE với quantity_out
```

## 📊 Verify Data Consistency

### Script Kiểm Tra Nhất Quán
```sql
-- So sánh currentStock trong DB vs tính từ ledger
SELECT
  t.id,
  t.tank_code,
  t.current_stock as db_stock,
  COALESCE(SUM(il.quantity_in - il.quantity_out), 0) as ledger_stock,
  t.current_stock - COALESCE(SUM(il.quantity_in - il.quantity_out), 0) as difference
FROM tanks t
LEFT JOIN inventory_ledger il ON il.tank_id = t.id
GROUP BY t.id, t.tank_code, t.current_stock
HAVING ABS(difference) > 0.001;

-- Nếu có kết quả → CÓ MÂU THUẪN, cần điều tra
-- Nếu không có kết quả → OK
```

### Đồng Bộ Current Stock (Nếu Cần)
```sql
-- Nếu phát hiện mâu thuẫn, chạy script này để sync
UPDATE tanks t
SET current_stock = (
  SELECT COALESCE(SUM(quantity_in - quantity_out), 0)
  FROM inventory_ledger
  WHERE tank_id = t.id
);

-- Verify lại
SELECT COUNT(*) FROM (
  SELECT
    t.id,
    ABS(t.current_stock - COALESCE(SUM(il.quantity_in - il.quantity_out), 0)) as diff
  FROM tanks t
  LEFT JOIN inventory_ledger il ON il.tank_id = t.id
  GROUP BY t.id
  HAVING diff > 0.001
) as inconsistent;
-- Kết quả phải = 0
```

## 🔧 Troubleshooting

### Vấn Đề 1: Tồn Kho Âm
```sql
-- Tìm tank có tồn âm
SELECT
  t.id,
  t.tank_code,
  COALESCE(SUM(il.quantity_in - il.quantity_out), 0) as stock
FROM tanks t
LEFT JOIN inventory_ledger il ON il.tank_id = t.id
GROUP BY t.id, t.tank_code
HAVING stock < 0;

-- Nguyên nhân:
-- 1. Có giao dịch xuất trước khi nhập
-- 2. Data migration sai
-- 3. Có ai đó edit manual trong DB

-- Giải pháp:
-- Xem chi tiết ledger của tank đó và fix thủ công
```

### Vấn Đề 2: API Trả Về currentStock = 0
```bash
# Check logs
pm2 logs swp-backend --lines 100

# Kiểm tra:
# 1. InventoryStockCalculatorService có được inject không?
# 2. Query có lỗi không?
# 3. Database connection OK không?
```

### Vấn Đề 3: Migration Fails
```bash
# Rollback migration
npm run migration:revert

# Check error logs
cat migration-error.log

# Thử chạy lại
npm run migration:run
```

## 🔄 Rollback Plan (Nếu Có Vấn Đề Nghiêm Trọng)

### Bước 1: Rollback Migration
```bash
npm run migration:revert
```

### Bước 2: Restore Code
```bash
git revert HEAD
# hoặc
git checkout <previous-commit>
```

### Bước 3: Rebuild & Restart
```bash
npm run build
pm2 restart swp-backend
```

### Bước 4: Verify
```bash
curl http://localhost:3000/tanks/1
# currentStock phải trở về giá trị từ DB
```

## 📝 Checklist Sau Deploy

- [ ] Migration chạy thành công
- [ ] Backend restart OK
- [ ] Tanks API trả về currentStock đúng
- [ ] Nhập hàng → tồn tăng
- [ ] Bán hàng → tồn giảm
- [ ] Inventory ledger có đầy đủ records
- [ ] Không có tồn kho âm
- [ ] Performance OK (response time < 500ms)
- [ ] Frontend hiển thị đúng
- [ ] Reports hoạt động bình thường

## 🎯 Monitoring

### Metrics Cần Theo Dõi

```bash
# 1. API Response Time
# GET /tanks/:id nên < 200ms
# GET /tanks nên < 500ms

# 2. Database Query Time
# Check slow query log
mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query%';"

# 3. Error Rate
pm2 logs swp-backend | grep -i error

# 4. Memory Usage
pm2 monit
```

## 📞 Liên Hệ

Nếu gặp vấn đề:
1. Check logs: `pm2 logs swp-backend`
2. Check database: Chạy script verify data consistency
3. Liên hệ team dev với thông tin chi tiết:
   - Error message
   - API endpoint bị lỗi
   - Data mẫu (nếu có)

---
**Chuẩn bị:** Backup database
**Thời gian dự kiến:** 15-30 phút
**Downtime:** Có (khoảng 5 phút)
**Risk Level:** Medium 🟡
