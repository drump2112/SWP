# 🧪 HƯỚNG DẪN TEST: Giải pháp 1 - Reopen Shift Fix

## 📋 Tóm tắt thay đổi

### Backend Changes
1. ✅ **reports.service.ts** - Added `superseded_by_shift_id IS NULL` filter to:
   - `getDebtReport()` - 2 queries
   - `getCashReport()` - 2 queries  
   - `getInventoryReport()` - 1 query
   - `getDashboard()` - 3 queries (debt, cash, inventory)

2. ✅ **inventory-stock-calculator.service.ts** - Added filter to ALL methods:
   - `getTankCurrentStock()`
   - `getTanksCurrentStock()`
   - `getWarehouseProductStock()`
   - `getWarehouseAllProductsStock()`
   - `getStoreTanksStock()`
   - `getWarehouseStockByTank()`

3. ✅ **shifts.service.ts** - Fixed `reopenShift()`:
   - Changed `supersededByShiftId: () => 'NULL'` → `supersededByShiftId: shiftId`
   - Added version increment: `shift.version++`
   - Added inventory_ledger superseded marking

### Frontend Changes
1. ✅ **ShiftOperationsPage.tsx** - Added UI indicators:
   - Yellow badge showing "Đã sửa X lần" in header
   - Warning box with detailed info about adjusted shifts
   - Version number display (v2, v3, etc.)

---

## 🧪 Kịch bản Test

### Test Case 1: Normal Shift (Không reopen)
**Mục tiêu:** Verify rằng shift bình thường vẫn hoạt động đúng

**Các bước:**
1. Tạo shift mới, nhập số liệu vòi bơm
2. Thêm 1-2 phiếu bán nợ
3. Thêm 1 phiếu thu
4. Chốt ca
5. ✅ **Kiểm tra:**
   - Báo cáo công nợ: Hiển thị đúng số tiền
   - Báo cáo sổ quỹ: Hiển thị đúng thu/chi
   - Báo cáo tồn kho: Giảm đúng số lượng bán
   - Dashboard: Tổng doanh thu đúng

**Expected Result:**
- Tất cả báo cáo hiển thị chính xác ✅
- Không có warning badge (version = 1)

---

### Test Case 2: Reopen & Edit (CRITICAL TEST)
**Mục tiêu:** Verify rằng khi reopen + sửa, báo cáo KHÔNG bị double-counting

**Setup:**
```
CA GỐC (SAI):
- Vòi 1: Bán 100 lít x 20,000đ = 2,000,000đ
- Bán nợ KH A: 1,000,000đ
- Bán lẻ: 1,000,000đ
```

**Các bước:**

#### Bước 1: Tạo ca SAI
1. Login vào hệ thống
2. Tạo shift mới
3. Nhập pump readings:
   - Vòi 1: Start=100, End=200 → 100 lít
   - Giá: 20,000đ/lít
4. Tab 2 - Bán hàng:
   - Bán nợ KH A: 50 lít x 20,000đ = 1,000,000đ
   - Bán lẻ: 50 lít (auto-calculate = 1,000,000đ)
5. Chốt ca

#### Bước 2: Verify ca SAI
- Vào "Báo cáo công nợ":
  - KH A: **+1,000,000đ** ✅
- Vào "Báo cáo sổ quỹ":
  - Thu bán lẻ: **+1,000,000đ** ✅
- Vào "Báo cáo tồn kho":
  - Xuất: **-100 lít** ✅

#### Bước 3: REOPEN ca (chỉ Admin)
1. Click "Mở lại ca" (nếu có button) hoặc dùng API
2. **KỲ VỌNG:**
   - Shift status = OPEN
   - shift.version = 2 ✅
   - UI hiển thị badge vàng "Đã sửa 1 lần" ✅
   - Warning box xuất hiện ✅

#### Bước 4: Sửa lại dữ liệu ĐÚNG
```
CA SỬA (ĐÚNG):
- Vòi 1: Bán 50 lít x 20,000đ = 1,000,000đ (SỬA: Đọc sai số cuối)
- Bán nợ KH A: 50 lít x 20,000đ = 1,000,000đ (KHÔNG ĐỔI)
- Bán lẻ: 0 lít (Sửa lại vì thực tế không có bán lẻ)
```

1. Tab 1 - Vòi bơm:
   - Sửa End=150 (thay vì 200) → 50 lít
2. Tab 2 - Bán hàng:
   - Bán lẻ: 0 lít (delete phiếu cũ hoặc nhập 0)
   - Bán nợ: GIỮ NGUYÊN 50 lít
3. Chốt ca lần 2

#### Bước 5: CRITICAL VERIFICATION ⚠️
**Đây là bước QUAN TRỌNG NHẤT!**

**A. Báo cáo Công nợ:**
```
✅ KỲ VỌNG: KH A có dư nợ = 1,000,000đ
❌ NẾU SAI: KH A có dư nợ = 2,000,000đ (double count)
```
- Vào "Báo cáo công nợ"
- Chọn KH A
- **VERIFY:** Tổng dư nợ = **1,000,000đ** ✅

**B. Báo cáo Sổ quỹ:**
```
✅ KỲ VỌNG: Không có phiếu thu bán lẻ (vì đã sửa = 0)
❌ NẾU SAI: Có 2 phiếu thu: 1,000,000đ + 0đ
```
- Vào "Báo cáo sổ quỹ"
- **VERIFY:** KHÔNG có phiếu thu bán lẻ nào ✅

**C. Báo cáo Tồn kho:**
```
✅ KỲ VỌNG: Xuất bán = 50 lít (từ ca đã sửa)
❌ NẾU SAI: Xuất bán = 150 lít (100 + 50)
```
- Vào "Báo cáo tồn kho"
- **VERIFY:** Tồn kho giảm đúng **50 lít** ✅

**D. Dashboard:**
```
✅ KỲ VỌNG: Tổng doanh thu = 1,000,000đ
❌ NẾU SAI: Tổng doanh thu = 3,000,000đ
```
- Vào Dashboard
- **VERIFY:** Tổng doanh thu = **1,000,000đ** ✅

---

### Test Case 3: Multiple Reopens (Stress Test)
**Mục tiêu:** Verify rằng reopen nhiều lần vẫn đúng

**Các bước:**
1. Tạo ca: Bán 100 lít = 2,000,000đ
2. Chốt ca (version = 1)
3. Reopen → Sửa: Bán 80 lít = 1,600,000đ
4. Chốt ca (version = 2)
5. Reopen → Sửa: Bán 60 lít = 1,200,000đ  
6. Chốt ca (version = 3)

**VERIFY:**
- Báo cáo CHỈ hiển thị: **1,200,000đ** ✅
- UI hiển thị: "Đã sửa 2 lần" ✅
- shift.version = 3 ✅

---

### Test Case 4: Mixed Shifts (Real-world scenario)
**Mục tiêu:** Verify khi có nhiều ca, chỉ ca được reopen bị filter

**Setup:**
```
CA 1: Bán 100 lít, KHÔNG reopen (version=1)
CA 2: Bán 100 lít, REOPEN & sửa → 50 lít (version=2)
CA 3: Bán 100 lít, KHÔNG reopen (version=1)
```

**VERIFY:**
- Tổng doanh thu = 100 + 50 + 100 = **250 lít** ✅
- Không phải: 100 + (100+50) + 100 = 350 lít ❌

---

## 🔍 Cách kiểm tra Database (Advanced)

### Query 1: Check superseded records
```sql
-- Xem các bản ghi đã bị superseded (KHÔNG đếm vào báo cáo)
SELECT * FROM cash_ledger 
WHERE superseded_by_shift_id IS NOT NULL
ORDER BY created_at DESC;

SELECT * FROM debt_ledger 
WHERE superseded_by_shift_id IS NOT NULL
ORDER BY created_at DESC;

SELECT * FROM inventory_ledger 
WHERE superseded_by_shift_id IS NOT NULL
ORDER BY created_at DESC;
```

**Expected:**
- Sau khi reopen shift X, các records cũ có `superseded_by_shift_id = X`

### Query 2: Verify shift version
```sql
SELECT id, shift_no, shift_date, version, status
FROM shifts
WHERE version > 1
ORDER BY shift_date DESC;
```

**Expected:**
- Shift đã reopen có `version = 2, 3, ...`

### Query 3: Manual total calculation
```sql
-- Tính tổng công nợ (CHỈ active records)
SELECT 
  customer_id,
  SUM(debit - credit) as total_debt
FROM debt_ledger
WHERE superseded_by_shift_id IS NULL
GROUP BY customer_id;

-- Tính tổng quỹ (CHỈ active records)
SELECT 
  SUM(cash_in - cash_out) as total_cash
FROM cash_ledger
WHERE superseded_by_shift_id IS NULL;

-- Tính tồn kho (CHỈ active records)
SELECT 
  product_id,
  SUM(quantity_in - quantity_out) as balance
FROM inventory_ledger
WHERE superseded_by_shift_id IS NULL
GROUP BY product_id;
```

**Expected:**
- Kết quả khớp với báo cáo trên UI ✅

---

## 🐛 Common Issues & Troubleshooting

### Issue 1: Vẫn thấy double values
**Triệu chứng:** Sau reopen, báo cáo hiển thị tổng gấp đôi

**Nguyên nhân:** Query chưa có filter `superseded_by_shift_id IS NULL`

**Giải pháp:**
1. Kiểm tra log SQL query trong console
2. Tìm query thiếu filter
3. Thêm `.andWhere('superseded_by_shift_id IS NULL')`

### Issue 2: UI không hiển thị badge "Đã sửa"
**Triệu chứng:** Shift đã reopen nhưng không có warning

**Nguyên nhân:** Frontend chưa nhận được `shift.version`

**Giải pháp:**
1. Check API response: `GET /shifts/:id/report`
2. Verify response có field `shift.version`
3. Check React component đã render đúng condition

### Issue 3: Reopen thất bại
**Triệu chứng:** API trả về error khi reopen

**Nguyên nhân:** Database chưa có column `superseded_by_shift_id`

**Giải pháp:**
```sql
-- Check column exists
SHOW COLUMNS FROM cash_ledger LIKE 'superseded_by_shift_id';
SHOW COLUMNS FROM debt_ledger LIKE 'superseded_by_shift_id';
SHOW COLUMNS FROM inventory_ledger LIKE 'superseded_by_shift_id';

-- If missing, run migration
ALTER TABLE cash_ledger ADD COLUMN superseded_by_shift_id INT NULL;
ALTER TABLE debt_ledger ADD COLUMN superseded_by_shift_id INT NULL;
ALTER TABLE inventory_ledger ADD COLUMN superseded_by_shift_id INT NULL;
```

---

## ✅ Acceptance Criteria

### PHẢI ĐẠT ĐƯỢC:
- [ ] Test Case 2 PASS (critical - không double count)
- [ ] Báo cáo công nợ đúng sau reopen
- [ ] Báo cáo sổ quỹ đúng sau reopen
- [ ] Báo cáo tồn kho đúng sau reopen
- [ ] Dashboard tổng hợp đúng
- [ ] UI hiển thị version badge
- [ ] UI hiển thị warning box

### NÊN ĐẠT ĐƯỢC:
- [ ] Test Case 3 PASS (multiple reopens)
- [ ] Test Case 4 PASS (mixed shifts)
- [ ] Performance OK (query không quá chậm)

---

## 📊 Test Report Template

```
=== REOPEN SHIFT FIX - TEST REPORT ===

Ngày test: ___________
Tester: ___________

Test Case 1: Normal Shift
- [ ] PASS  [ ] FAIL
Notes: _______________________________

Test Case 2: Reopen & Edit (CRITICAL)
- [ ] PASS  [ ] FAIL
- Công nợ: [ ] OK  [ ] Double  
- Sổ quỹ: [ ] OK  [ ] Double
- Tồn kho: [ ] OK  [ ] Double
- Dashboard: [ ] OK  [ ] Double
Notes: _______________________________

Test Case 3: Multiple Reopens
- [ ] PASS  [ ] FAIL
Notes: _______________________________

Test Case 4: Mixed Shifts
- [ ] PASS  [ ] FAIL
Notes: _______________________________

UI/UX Check:
- [ ] Version badge hiển thị
- [ ] Warning box hiển thị
- [ ] Không có lỗi console

Database Check:
- [ ] Superseded records có đúng flag
- [ ] Shift version tăng đúng
- [ ] Manual query khớp với UI

Overall: [ ] PASS  [ ] FAIL
```

---

## 🚀 Next Steps After Testing

**Nếu test PASS:**
1. ✅ Deploy lên production
2. ✅ Train users về tính năng reopen
3. ✅ Monitor báo cáo 1-2 tuần

**Nếu test FAIL:**
1. ❌ Ghi log chi tiết lỗi
2. ❌ Báo cáo cho dev (attach test report)
3. ❌ CHỜ fix trước khi deploy

---

**CHÚ Ý:** Test Case 2 là QUAN TRỌNG NHẤT. Nếu fail ở đây thì TOÀN BỘ giải pháp bị lỗi!
