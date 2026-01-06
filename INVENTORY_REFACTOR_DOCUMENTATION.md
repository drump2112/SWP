# Tài Liệu: Refactor Hệ Thống Nhập Xuất Tồn

## 📋 Tóm Tắt Thay Đổi

### Vấn Đề Cũ
Hệ thống cũ duy trì **2 nguồn dữ liệu tồn kho** gây mâu thuẫn:
- `Tank.currentStock`: Lưu trực tiếp số lượng tồn trong bể
- `InventoryLedger`: Ghi nhận sổ chi tiết nhập/xuất

**Hậu quả:**
- Khi nhập hàng → cập nhật cả `currentStock` VÀ `InventoryLedger`
- Khi xuất hàng (bán lẻ) → chỉ trừ `currentStock`, KHÔNG ghi `InventoryLedger`
- Kết quả: **Dữ liệu không khớp, không thể truy vết, báo cáo sai**

### Giải Pháp Mới: Single Source of Truth

✅ **`InventoryLedger` là nguồn dữ liệu DUY NHẤT**
- Mọi giao dịch nhập/xuất đều ghi vào `inventory_ledger`
- Tồn kho = `SUM(quantity_in - quantity_out)` từ ledger
- Bỏ việc cập nhật trực tiếp `Tank.currentStock`

## 🏗️ Kiến Trúc Mới

### 1. Service Chính: `InventoryStockCalculatorService`

**File:** `BackEnd/src/inventory/inventory-stock-calculator.service.ts`

**Chức năng:**
```typescript
// Lấy tồn kho của 1 bể
getTankCurrentStock(tankId: number): Promise<number>

// Lấy tồn kho nhiều bể cùng lúc
getTanksCurrentStock(tankIds: number[]): Promise<Map<number, number>>

// Lấy tồn kho theo kho và sản phẩm
getWarehouseProductStock(warehouseId: number, productId: number): Promise<number>

// Lấy tồn kho tất cả sản phẩm trong kho
getWarehouseAllProductsStock(warehouseId: number): Promise<Array<...>>

// Lấy tồn kho tất cả bể trong cửa hàng
getStoreTanksStock(storeId: number): Promise<Array<...>>

// Kiểm tra có đủ hàng để xuất không
canExportFromTank(tankId: number, quantity: number): Promise<{...}>

// Kiểm tra có vượt dung tích bể không
willExceedCapacity(tankId: number, additionalQuantity: number): Promise<{...}>
```

### 2. Thay Đổi Trong Các Service

#### A. `inventory.service.ts`
**TRƯỚC:**
```typescript
// ❌ SAI: Cập nhật currentStock trực tiếp
if (item.tankId) {
  const tank = await manager.findOne(Tank, { where: { id: item.tankId } });
  if (tank) {
    tank.currentStock = Number(tank.currentStock) + Number(item.quantity);
    await manager.save(Tank, tank);
  }
}
```

**SAU:**
```typescript
// ✅ ĐÚNG: Chỉ ghi vào InventoryLedger
const ledger = manager.create(InventoryLedger, {
  warehouseId: warehouseId,
  productId: item.productId,
  refType: createDto.docType,
  refId: savedDocument.id,
  quantityIn: isInbound ? item.quantity : 0,
  quantityOut: isInbound ? 0 : item.quantity,
  tankId: item.tankId,
});
await manager.save(InventoryLedger, ledger);
// Không cập nhật currentStock nữa
```

#### B. `shifts.service.ts`
**TRƯỚC:**
```typescript
// ❌ SAI: Chỉ trừ currentStock, không ghi ledger
await manager
  .createQueryBuilder()
  .update('tanks')
  .set({
    currentStock: () => `current_stock - ${reading.quantity}`,
  })
  .where('id = :tankId', { tankId: pump.tankId })
  .execute();
```

**SAU:**
```typescript
// ✅ ĐÚNG: Ghi xuất kho vào InventoryLedger
const warehouse = await manager.findOne(Warehouse, {
  where: { storeId: shift.storeId, type: 'STORE' },
});

await manager.save(InventoryLedger, {
  warehouseId: warehouse.id,
  productId: reading.productId,
  tankId: pump.tankId,
  refType: 'SHIFT_SALE',
  refId: shift.id,
  quantityIn: 0,
  quantityOut: reading.quantity,
});
```

#### C. `tanks.service.ts`
**TRƯỚC:**
```typescript
// ❌ SAI: Trả về currentStock từ database
async findAll(): Promise<Tank[]> {
  return this.tanksRepository.find({
    relations: ['store', 'product', 'pumps'],
  });
}
// Tank.currentStock là giá trị cũ, không chính xác
```

**SAU:**
```typescript
// ✅ ĐÚNG: Tính tồn kho từ ledger
async findAll(): Promise<any[]> {
  const tanks = await this.tanksRepository.find({
    relations: ['store', 'product', 'pumps'],
  });

  const tankIds = tanks.map(t => t.id);
  const stockMap = await this.stockCalculatorService.getTanksCurrentStock(tankIds);

  return tanks.map(tank => ({
    ...tank,
    currentStock: stockMap.get(tank.id) || 0,  // Tồn kho THỰC TẾ từ ledger
    fillPercentage: (stockMap.get(tank.id) || 0) / tank.capacity * 100,
  }));
}
```

## 📊 Cách Tính Tồn Kho Mới

### SQL Query Cơ Bản
```sql
-- Tồn kho của một bể
SELECT
  tank_id,
  COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock
FROM inventory_ledger
WHERE tank_id = ?
GROUP BY tank_id;

-- Tồn kho tất cả bể trong cửa hàng
SELECT
  il.tank_id,
  t.tank_code,
  t.name as tank_name,
  t.capacity,
  p.code as product_code,
  p.name as product_name,
  COALESCE(SUM(il.quantity_in - il.quantity_out), 0) as current_stock
FROM inventory_ledger il
LEFT JOIN tanks t ON t.id = il.tank_id
LEFT JOIN product p ON p.id = il.product_id
WHERE t.store_id = ?
  AND t.is_active = true
GROUP BY il.tank_id, t.tank_code, t.name, t.capacity, p.code, p.name;
```

### Index Tối Ưu
```sql
-- Index đã tồn tại trong bảng inventory_ledger
CREATE INDEX idx_inventory_ledger_lookup
ON inventory_ledger(warehouse_id, product_id, created_at);

-- Thêm index cho tank_id (nếu chưa có)
CREATE INDEX idx_inventory_ledger_tank
ON inventory_ledger(tank_id, product_id);
```

## 🔄 Các Loại Giao Dịch Ghi Vào Ledger

| Giao dịch | refType | quantityIn | quantityOut | tankId |
|-----------|---------|------------|-------------|--------|
| Nhập hàng từ NCC | IMPORT | X | 0 | Có |
| Điều chuyển đến | TRANSFER_IN | X | 0 | Có |
| Điều chuyển đi | TRANSFER_OUT | 0 | X | Có |
| Bán lẻ (shift) | SHIFT_SALE | 0 | X | Có |
| Bán công nợ | DEBT_SALE | 0 | X | Có |
| Kiểm kê tăng | ADJUSTMENT | X | 0 | Có |
| Kiểm kê giảm | ADJUSTMENT | 0 | X | Có |

## 🗃️ Database Migration

### Migration: `1736200000000-DeprecateTankCurrentStock.ts`

**Mục đích:**
- Đánh dấu cột `current_stock` là DEPRECATED
- KHÔNG xóa cột ngay (để rollback nếu cần)
- Thêm comment cảnh báo

**Chạy migration:**
```bash
npm run migration:run
```

**Rollback (nếu cần):**
```bash
npm run migration:revert
```

## 🧪 Testing Checklist

### Test Cases Quan Trọng

#### 1. Test Nhập Hàng
```typescript
// Tạo phiếu nhập
const doc = await inventoryService.createDocument({
  warehouseId: 1,
  docType: 'IMPORT',
  docDate: new Date(),
  items: [{
    productId: 1,
    tankId: 1,
    quantity: 1000,
    unitPrice: 21000,
  }],
});

// Kiểm tra ledger đã được ghi
const stock = await stockCalculator.getTankCurrentStock(1);
expect(stock).toBe(1000);
```

#### 2. Test Bán Lẻ (Shift)
```typescript
// Đóng ca với pump readings
await shiftsService.closeShift({
  shiftId: 1,
  pumpReadings: [{
    pumpCode: 'P001',
    productId: 1,
    startValue: 0,
    endValue: 500,
  }],
});

// Kiểm tra tồn kho giảm
const stock = await stockCalculator.getTankCurrentStock(1);
expect(stock).toBe(500);  // 1000 - 500

// Kiểm tra ledger có record SHIFT_SALE
const ledgers = await inventoryLedgerRepo.find({
  where: { refType: 'SHIFT_SALE', refId: 1 },
});
expect(ledgers).toHaveLength(1);
expect(ledgers[0].quantityOut).toBe(500);
```

#### 3. Test API Tanks
```typescript
// GET /tanks/:id
const response = await request(app).get('/tanks/1');
expect(response.body.currentStock).toBe(500);  // Từ ledger
expect(response.body.fillPercentage).toBeCloseTo(50);  // 500/1000 * 100
```

## 🚨 Breaking Changes

### API Response Changes

**Tanks API - KHÔNG thay đổi cấu trúc response:**
```json
{
  "id": 1,
  "tankCode": "T001",
  "name": "Bồn 1",
  "capacity": 1000,
  "currentStock": 500,  // ✅ Vẫn có, nhưng giá trị từ ledger
  "fillPercentage": 50
}
```

**Lưu ý:** Frontend KHÔNG cần thay đổi gì!

## 📝 Lưu Ý Quan Trọng

### 1. Performance
- Query tính tồn kho sử dụng `SUM()` và index nên rất nhanh
- Với hệ thống nhỏ/vừa (<100K records), performance gần như không ảnh hưởng
- Nếu cần tối ưu thêm, có thể cache kết quả

### 2. Data Integrity
- **QUAN TRỌNG:** Mọi giao dịch nhập/xuất PHẢI ghi vào `inventory_ledger`
- Nếu quên ghi ledger → tồn kho sai → báo cáo sai
- Luôn dùng transaction khi tạo document

### 3. Rollback Plan
```sql
-- Nếu cần rollback về cách cũ (KHÔNG khuyến khích):

-- 1. Tính lại currentStock từ ledger
UPDATE tanks t
SET current_stock = (
  SELECT COALESCE(SUM(quantity_in - quantity_out), 0)
  FROM inventory_ledger
  WHERE tank_id = t.id
);

-- 2. Revert code về version cũ
git revert <commit-hash>
```

## 🎯 Kết Luận

### Lợi Ích
✅ **Dữ liệu nhất quán:** Một nguồn dữ liệu duy nhất
✅ **Truy vết đầy đủ:** Mọi giao dịch đều được ghi lại
✅ **Báo cáo chính xác:** Tồn kho luôn khớp với lịch sử giao dịch
✅ **Dễ kiểm toán:** Có thể tính tồn kho tại bất kỳ thời điểm nào
✅ **Không breaking change:** API không thay đổi cấu trúc response

### Rủi Ro
⚠️ **Performance:** Query phức tạp hơn (nhưng đã optimize với index)
⚠️ **Migration risk:** Cần test kỹ trước khi deploy
⚠️ **Training:** Dev cần hiểu rõ không được cập nhật currentStock trực tiếp

## 📞 Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. Migration đã chạy thành công chưa
2. Tất cả giao dịch có ghi vào `inventory_ledger` không
3. Index đã được tạo chưa
4. Log có lỗi gì không

---
**Ngày cập nhật:** 2026-01-06
**Version:** 2.0.0
**Tác giả:** Development Team
