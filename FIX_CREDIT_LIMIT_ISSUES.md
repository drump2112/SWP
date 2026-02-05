# SỬA LỖI QUẢN LÝ ĐỊNH MỨC CÔNG NỢ

**Ngày:** 2026-02-05  
**Vấn đề:** Hệ thống tính toán hạn mức công nợ không đúng - hiển thị hạn mức mặc định thay vì hạn mức hiệu lực tại từng cửa hàng.

---

## 🔴 CÁC VẤN ĐỀ ĐÃ PHÁT HIỆN

### 1. **WHERE Clause Sai trong LEFT JOIN** (NGHIÊM TRỌNG)
**File:** `BackEnd/src/customers/customers.service.ts` - Line 313

**Vấn đề:**
```typescript
.leftJoin('customer_stores', 'cs', 'cs.customer_id = c.id AND cs.store_id = :storeId')
.where('cs.store_id = :storeId') // ❌ Sai - biến LEFT JOIN thành INNER JOIN
```

**Hậu quả:**
- Chỉ hiển thị khách hàng ĐÃ CÓ record trong `customer_stores`
- Khách hàng chưa có record → bị loại bỏ khỏi danh sách
- Điều này khiến một số khách hàng không xuất hiện trong báo cáo hạn mức

**Đã sửa:**
```typescript
.leftJoin('customer_stores', 'cs', 'cs.customer_id = c.id AND cs.store_id = :storeId')
// Bỏ WHERE clause - điều kiện đã có trong ON clause
```

---

### 2. **Logic Kiểm Tra Thời Gian Bypass Không Nhất Quán**

**Vấn đề:** Có 5 cách khác nhau để kiểm tra bypass đã hết hạn:

| Vị trí | Logic | Toán tử |
|--------|-------|---------|
| SQL query (line 320) | `bypass_until > NOW()` | `>` |
| isDateExpired (line 352) | `dateStr.getTime() <= Date.now()` | `<=` |
| isDateExpired (line 414) | `date.getTime() <= Date.now()` | `<=` |
| checkBypassCreditLimit (line 889) | `bypassUntil < now` | `<` |
| getStoreCreditLimits (line 694) | `bypassUntil >= now` | `>=` |

**Hậu quả:**
- Tại cùng một thời điểm, một nơi cho rằng đã hết hạn, nơi khác cho là còn hiệu lực
- Ví dụ: Nếu `bypass_until = 2026-02-05 10:00:00` và `now = 2026-02-05 10:00:00`:
  - Theo `>`: Đã hết hạn
  - Theo `>=`: Vẫn còn hiệu lực

**Đã sửa:** Chuẩn hóa toàn bộ thành:
- **Còn hiệu lực:** `bypass_until IS NULL OR bypass_until > NOW()`
- **Đã hết hạn:** `bypass_until IS NOT NULL AND bypass_until <= NOW()`

---

### 3. **getCreditStatus() Không Dùng Hạn Mức Hiệu Lực**

**Vấn đề:**
```typescript
const creditLimit = Number(customer.creditLimit || 0); // ❌ Chỉ dùng mặc định
```

**Đã sửa:**
```typescript
const creditLimit = storeId 
  ? await this.getEffectiveCreditLimit(customerId, storeId) // ✅ Ưu tiên hạn mức riêng
  : Number(customer.creditLimit || 0);
```

---

### 4. **Thiếu Debug Log**

**Thêm log chi tiết** để dễ debug:
```typescript
console.log(`[Credit Status] ${row.customerName} (${row.customerCode}): storeLimit=${storeCreditLimit}, defaultLimit=${defaultCreditLimit}, effectiveLimit=${creditLimit}, debt=${currentDebt}, available=${availableCredit}, bypass=${isBypassed}`);
```

---

## ✅ GIẢI PHÁP ĐÃ TRIỂN KHAI

### 1. **Sửa Backend Service** (`customers.service.ts`)

#### a. Bỏ WHERE clause sai trong `getAllCreditStatus()`
- Loại bỏ `.where('cs.store_id = :storeId')` 
- Điều kiện store đã được filter trong LEFT JOIN ON clause

#### b. Chuẩn hóa logic kiểm tra thời gian bypass
- Tất cả đều dùng: `bypass_until > NOW()` (còn hiệu lực)
- Hoặc: `bypass_until <= NOW()` (đã hết hạn)

#### c. Fix `getCreditStatus()` để dùng hạn mức hiệu lực
- Gọi `getEffectiveCreditLimit()` khi có `storeId`
- Ưu tiên `customer_stores.credit_limit` trước `customers.credit_limit`

#### d. Thêm debug log toàn diện
- Log tất cả giá trị để dễ troubleshoot

---

### 2. **Tạo Database Migration** (`fix-credit-limit-bypass-logic.sql`)

#### a. Tự động vô hiệu hóa bypass đã hết hạn
```sql
UPDATE customers
SET bypass_credit_limit = FALSE, bypass_until = NULL
WHERE bypass_credit_limit = TRUE
  AND bypass_until IS NOT NULL
  AND bypass_until <= NOW();
```

#### b. Tạo trigger tự động vô hiệu hóa
- Function: `auto_disable_expired_bypass()`
- Trigger cho `customers` và `customer_stores`
- Tự động set `bypass_credit_limit = FALSE` khi `bypass_until <= NOW()`

#### c. Tạo View để query dễ dàng
```sql
CREATE VIEW v_customer_effective_credit_limit AS
SELECT 
  c.id,
  COALESCE(cs.credit_limit, c.credit_limit, 0) as effective_credit_limit,
  CASE 
    WHEN cs.bypass_credit_limit = TRUE AND (cs.bypass_until IS NULL OR cs.bypass_until > NOW())
    THEN TRUE
    WHEN c.bypass_credit_limit = TRUE AND (c.bypass_until IS NULL OR c.bypass_until > NOW())
    THEN TRUE
    ELSE FALSE
  END as is_bypassed,
  ...
FROM customers c
CROSS JOIN stores s
LEFT JOIN customer_stores cs ON c.id = cs.customer_id AND s.id = cs.store_id;
```

#### d. Tạo index để tối ưu
```sql
CREATE INDEX idx_customer_stores_bypass_until 
  ON customer_stores(bypass_until) 
  WHERE bypass_credit_limit = TRUE AND bypass_until IS NOT NULL;
```

---

## 📋 CÁCH TRIỂN KHAI

### Bước 1: Deploy Backend Code
```bash
cd /home/seth/WorkSpace/SWP/SWP/BackEnd
docker-compose restart backend
```

### Bước 2: Chạy Migration SQL
```bash
# Copy file vào container
docker cp fix-credit-limit-bypass-logic.sql swp-postgres:/tmp/

# Chạy migration
docker exec -it swp-postgres psql -U postgres -d fuel_management -f /tmp/fix-credit-limit-bypass-logic.sql
```

### Bước 3: Kiểm tra log
```bash
# Xem log backend để kiểm tra debug output
docker logs -f swp-backend | grep "Credit Status"
```

### Bước 4: Test trên Frontend
1. Truy cập trang "Hạn mức công nợ"
2. Kiểm tra khách hàng "G TY TNHH TUẤN MẠNH MD"
3. Xác nhận:
   - **HẠN MỨC** hiển thị: **1,000,000,000 ₫** (1 tỷ)
   - **CÒN LẠI** = 1 tỷ - 636.575.515 = **363,424,485 ₫** ✅
   - **VƯỢT HẠN** = 0 (vì vẫn trong hạn mức) ✅

---

## 🧪 KIỂM TRA

### 1. Kiểm tra hạn mức hiệu lực
```sql
SELECT * FROM v_customer_effective_credit_limit
WHERE customer_code = 'KH0002' AND store_id = 81;
```

**Kết quả mong đợi:**
- `default_credit_limit`: 0
- `store_specific_limit`: 1000000000
- `effective_credit_limit`: 1000000000 ✅

### 2. Kiểm tra bypass đã hết hạn
```sql
SELECT * FROM v_customer_effective_credit_limit
WHERE is_bypassed = TRUE;
```

### 3. Kiểm tra khách hàng vượt hạn
```sql
SELECT * FROM v_customer_effective_credit_limit
WHERE current_debt > effective_credit_limit
  AND is_bypassed = FALSE
ORDER BY current_debt DESC;
```

---

## 📊 KẾT QUẢ MONG ĐỢI

### Trước khi sửa:
- ❌ Hạn mức: **0 ₫** (sai - dùng mặc định)
- ❌ Còn lại: **-636.575.515 ₫** (sai)
- ❌ Vượt hạn: **636.575.515 ₫** (sai)

### Sau khi sửa:
- ✅ Hạn mức: **1,000,000,000 ₫** (đúng - dùng hạn mức riêng)
- ✅ Còn lại: **363,424,485 ₫** (đúng)
- ✅ Vượt hạn: **0 ₫** (đúng - không vượt)

---

## 🔒 LƯU Ý

1. **Timezone:** Đảm bảo database đã set `timezone = 'Asia/Ho_Chi_Minh'`
2. **Backup:** Đã backup trước khi chạy migration
3. **Testing:** Test kỹ trước khi deploy lên production
4. **Performance:** View có thể chậm với nhiều khách hàng - cân nhắc materialized view nếu cần

---

## 📝 CHECKLIST DEPLOY

- [ ] Review code changes trong `customers.service.ts`
- [ ] Build và restart backend container
- [ ] Chạy migration SQL
- [ ] Kiểm tra log backend
- [ ] Test frontend với khách hàng mẫu
- [ ] Kiểm tra view `v_customer_effective_credit_limit`
- [ ] Monitor performance sau deploy
- [ ] Thông báo team về thay đổi

---

## 🆘 ROLLBACK (Nếu cần)

```sql
-- Xóa view
DROP VIEW IF EXISTS v_customer_effective_credit_limit;

-- Xóa trigger
DROP TRIGGER IF EXISTS trigger_auto_disable_customer_bypass ON customers;
DROP TRIGGER IF EXISTS trigger_auto_disable_store_bypass ON customer_stores;

-- Xóa function
DROP FUNCTION IF EXISTS auto_disable_expired_bypass();

-- Restore code từ git
git checkout HEAD -- BackEnd/src/customers/customers.service.ts
docker-compose restart backend
```
