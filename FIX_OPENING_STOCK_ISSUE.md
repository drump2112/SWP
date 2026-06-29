# Lỗi Báo Cáo Nhập Xuất Tồn - Hướng Dẫn Khắc Phục

## 🔴 Vấn Đề Phát Hiện

Khi bạn thêm tồn đầu cho 3 mặt hàng khác nhau (sản phẩm 1: 12211, sản phẩm 2: 6027, sản phẩm 3: 5032), báo cáo nhập xuất tồn lại hiển thị tất cả đều có số lượng **23270** (tổng của cả 3).

## 🔍 Nguyên Nhân Gốc Rễ

1. **Lỗi Backend**: Khi thêm tồn đầu qua API `/inventory/simple-initial-stock`, hệ thống **không lưu `tank_id`** vào bảng `inventory_ledger`.

2. **Database State**:
   ```sql
   -- Các bản ghi opening stock có tank_id = NULL ❌
   SELECT * FROM inventory_ledger 
   WHERE ref_type = 'ADJUSTMENT' AND tank_id IS NULL;
   
   -- Kết quả:
   id | warehouse_id | product_id | tank_id | quantity_in
   1  |            1 |          1 |  NULL   |    12211.000
   2  |            1 |          2 |  NULL   |     6027.000
   3  |            1 |          3 |  NULL   |     5032.000
   ```

3. **Lỗi Báo Cáo**: Khi tính tồn đầu, hệ thống lọc theo `tank_id`:
   ```typescript
   .andWhere('il.tankId = :tankId', { tankId: tank.id })
   ```
   Nhưng không tìm thấy các opening stock entries (vì `tank_id = NULL`), dẫn đến sai tính toán.

## ✅ Giải Pháp Được Triển Khai

### 1. **Sửa Backend** (`inventory.service.ts`)

**Trước** (Sai):
```typescript
const ledger = {
  warehouseId: warehouse.id,
  productId: item.productId,
  tankId: undefined,  // ❌ Không lưu tank_id
  refType: 'ADJUSTMENT',
  ...
};
```

**Sau** (Đúng):
```typescript
// 🔥 Tự động tìm tank của sản phẩm
const tank = tanks.find((t) => t.productId === item.productId);
if (!tank) throw new Error('Không tìm thấy bể cho mặt hàng');

const ledger = manager.create(InventoryLedger, {
  warehouseId: warehouse.id,
  productId: item.productId,
  tankId: tank.id,  // ✅ Lưu tank_id chính xác
  refType: 'ADJUSTMENT',
  ...
});
```

### 2. **Cập Nhật Dữ Liệu Lịch Sử**

Chạy script SQL để fix các bản ghi cũ với `tank_id = NULL`:

```bash
cd BackEnd
# Kết nối đến database và chạy script
psql -U [username] -d [dbname] -f fix-opening-stock-tank-id.sql
```

Hoặc nếu đang sử dụng Docker:
```bash
docker-compose exec postgres psql -U postgres -d swp_db -f /tmp/fix-opening-stock-tank-id.sql
```

## 📋 Các Bước Khắc Phục

### Bước 1: Deploy Code Mới
```bash
cd BackEnd
npm install
npm run build
docker-compose up --build backend
```

### Bước 2: Chạy Script Fix Database
```sql
-- File: BackEnd/fix-opening-stock-tank-id.sql
-- Chạy các câu lệnh trong file này để cập nhật tank_id cho các bản ghi cũ
```

### Bước 3: Xóa Cache Frontend
Xóa dữ liệu cache trong trình duyệt:
- Nhấn F12 → Application/Storage → Xóa Local Storage
- Hoặc: Ctrl+Shift+Delete → Xóa dữ liệu được cache

### Bước 4: Test Báo Cáo
1. Thêm tồn đầu mới qua menu "Cài đặt → Thêm tồn đầu"
2. Vào "Báo cáo → Nhập Xuất Tồn"
3. Kiểm tra xem mỗi mặt hàng có hiển thị đúng số lượng tồn đầu không

## 🧪 Cách Kiểm Tra

Trước khi chạy báo cáo, kiểm tra database:

```sql
-- Xem các bản ghi opening stock
SELECT 
  il.id,
  il.product_id,
  p.name,
  il.tank_id,
  t.tank_code,
  il.quantity_in,
  il.ref_type
FROM inventory_ledger il
LEFT JOIN products p ON p.id = il.product_id
LEFT JOIN tanks t ON t.id = il.tank_id
WHERE il.ref_type = 'ADJUSTMENT' 
  AND il.shift_id IS NULL
ORDER BY il.created_at DESC;
```

**Kết quả kỳ vọng**:
```
id | product_id | name     | tank_id | tank_code | quantity_in | ref_type
1  |          1 | Xăng A95 |       1 | TANK-001  |    12211.0  | ADJUSTMENT
2  |          2 | Dầu 05   |       2 | TANK-002  |     6027.0  | ADJUSTMENT
3  |          3 | Dầu 01   |       3 | TANK-003  |     5032.0  | ADJUSTMENT
```
✅ Tất cả đều có `tank_id` != NULL

## 📊 Kết Quả Sau Khi Fix

| Mặt Hàng | Tồn Đầu | Báo Cáo Trước | Báo Cáo Sau |
|---------|---------|---------------|------------|
| Xăng A95 | 12211 | 23270 ❌ | 12211 ✅ |
| Dầu 05 | 6027 | 23270 ❌ | 6027 ✅ |
| Dầu 01 | 5032 | 23270 ❌ | 5032 ✅ |

## ⚠️ Lưu Ý Quan Trọng

1. **Mỗi mặt hàng phải có ít nhất 1 bể chứa (Tank)**
   - Nếu không có tank, hệ thống sẽ báo lỗi khi thêm tồn đầu
   - Tạo tank trước: Menu "Cài đặt → Quản lý Bể"

2. **Không được để sản phẩm không có tank**
   - Kiểm tra: Menu "Cài đặt → Bể chứa" → Phải có tank cho mỗi sản phẩm

3. **Khi cập nhật tồn đầu cũ**
   - Hệ thống sẽ tự động tìm tank nếu không được cung cấp
   - Nếu sản phẩm có multiple tanks, cần xác định chính xác tank nào

## 📞 Hỗ Trợ

Nếu vẫn gặp vấn đề sau khi fix:
1. Kiểm tra xem tất cả sản phẩm có tank không
2. Chạy lại script SQL để đảm bảo dữ liệu được cập nhật
3. Clear cache trình duyệt
4. Kiểm tra console browser (F12) có lỗi gì không
