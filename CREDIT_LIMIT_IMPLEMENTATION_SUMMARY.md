# ✅ Tổng Hợp Implementation - Quản Lý Hạn Mức Công Nợ Theo Cửa Hàng

**Ngày hoàn thành:** 2026-01-13
**Trạng thái:** ✅ HOÀN TẤT (trừ validation chốt ca/sửa ca)

---

## 📦 **ĐÃ IMPLEMENT**

### **1. Backend API** ✅

#### **Entity & DTO:**
- ✅ [customer-store.entity.ts](cci:1://file:///home/seth/WorkSpace/SWP/SWP/BackEnd/src/entities/customer-store.entity.ts:0:0-0:0) - Thêm `creditLimit` column
- ✅ [update-store-credit-limit.dto.ts](cci:1://file:///home/seth/WorkSpace/SWP/SWP/BackEnd/src/customers/dto/update-store-credit-limit.dto.ts:0:0-0:0) - DTO mới

#### **API Endpoints:**

| Method | Endpoint | Mô tả | Status |
|--------|----------|-------|--------|
| GET | `/customers/:id/store-credit-limits` | Lấy hạn mức tất cả stores | ✅ Done |
| PUT | `/customers/:id/stores/:storeId/credit-limit` | Cập nhật hạn mức riêng | ✅ Done |
| POST | `/customers/:id/validate-debt-limit` | Validate hạn mức | ✅ Done |

#### **Service Methods:**
```typescript
✅ getStoreCreditLimits(customerId, filterStoreId?)
   - Lấy danh sách hạn mức theo stores
   - Tính nợ hiện tại, còn lại, % sử dụng
   - Hỗ trợ filter cho store user

✅ updateStoreCreditLimit(customerId, storeId, dto)
   - Cập nhật hạn mức riêng cho store
   - Tự động tạo customer_store nếu chưa có

✅ getEffectiveCreditLimit(customerId, storeId)
   - Lấy hạn mức hiệu lực (ưu tiên riêng > mặc định)

✅ validateDebtLimit(customerId, storeId, newDebtAmount)
   - Validate xem có vượt hạn mức không
   - Trả về chi tiết: isValid, exceedAmount, message
```

---

### **2. Frontend UI** ✅

#### **API Client:**
- ✅ [customers.ts](cci:1://file:///home/seth/WorkSpace/SWP/SWP/FrontEnd/src/api/customers.ts:0:0-0:0) - Thêm interfaces & methods

#### **Trang Quản Lý Khách Hàng:**
- ✅ [CustomersPage.tsx](cci:1://file:///home/seth/WorkSpace/SWP/SWP/FrontEnd/src/pages/CustomersPage.tsx:0:0-0:0)
  - Thêm button "Hạn mức" cho mỗi khách hàng
  - Modal quản lý hạn mức đầy đủ
  - Table hiển thị hạn mức theo từng store
  - Inline editing cho từng store
  - Loading state & error handling

#### **UI Features:**
```
✅ Modal "Quản lý hạn mức công nợ"
   - Hiển thị hạn mức mặc định
   - Table danh sách stores với:
     • Cửa hàng
     • Hạn mức riêng (editable)
     • Hạn mức hiệu lực
     • Nợ hiện tại
     • Còn lại
     • % sử dụng (có màu warning)
     • Button Sửa/Lưu/Hủy

✅ Color-coded warnings:
   - 🟢 < 70%: Safe (green)
   - 🟡 70-90%: Warning (yellow)
   - 🟠 90-100%: Danger (orange)
   - 🔴 > 100%: Overlimit (red)

✅ Phân quyền:
   - Admin/Director/Sales: Xem tất cả stores
   - Store user: Chỉ xem store của mình
```

---

### **3. Báo Cáo Công Nợ** ✅

#### **Backend:**
- ✅ [reports.service.ts](cci:1://file:///home/seth/WorkSpace/SWP/SWP/BackEnd/src/reports/reports.service.ts:275:0-327:0) - `getAllCreditStatus()`
  - Filter khách hàng theo store (nếu có storeId)
  - Lấy `creditLimit` từ `customer_stores` nếu có
  - Ưu tiên hạn mức riêng > mặc định

#### **Frontend:**
- ✅ [CustomerCreditPage.tsx](cci:1://file:///home/seth/WorkSpace/SWP/SWP/FrontEnd/src/pages/CustomerCreditPage.tsx:0:0-0:0)
  - Tự động truyền `user.storeId` khi query
  - Hiển thị đúng hạn mức theo store

---

## 🔄 **LUỒNG HOẠT ĐỘNG**

### **A. Thiết Lập Hạn Mức:**
```
1. Admin vào "Quản lý khách hàng"
2. Click "Hạn mức" ở khách hàng cần thiết lập
3. Modal hiển thị:
   - Hạn mức mặc định: 50tr
   - Danh sách stores:
     • CH HN: [____] → Nhập 10tr → Lưu
     • CH HCM: [____] → Nhập 20tr → Lưu
     • CH ĐN: [____] → Để trống = dùng 50tr
4. Hệ thống lưu vào customer_stores.credit_limit
```

### **B. Báo Cáo Công Nợ:**
```
User Role: STORE (storeId = 2)

1. Vào "Báo cáo hạn mức công nợ"
2. Backend tự động:
   - Filter khách hàng: CHỈ lấy khách của CH HCM (id=2)
   - Lấy creditLimit: customerStore.creditLimit ?? customer.creditLimit
   - Tính nợ: CHỈ tính nợ tại CH HCM
3. Hiển thị:
   ┌────────┬──────────┬─────────┬──────────┐
   │ KH A   │ 20tr*    │ 18tr nợ │ 🟡 90%   │
   │ KH B   │ 50tr     │ 10tr nợ │ 🟢 20%   │
   └────────┴──────────┴─────────┴──────────┘
   * = Hạn mức riêng cho CH HCM
```

### **C. Logic Lấy Hạn Mức Hiệu Lực:**
```typescript
function getEffectiveCreditLimit(customerId, storeId) {
  const cs = await CustomerStore.findOne({ customerId, storeId });

  // Ưu tiên hạn mức riêng
  if (cs?.creditLimit !== null) {
    return cs.creditLimit; // VD: 20tr tại CH HCM
  }

  // Fallback về mặc định
  const customer = await Customer.findOne(customerId);
  return customer.creditLimit ?? 0; // VD: 50tr mặc định
}
```

---

## ⚠️ **CHƯA IMPLEMENT (Theo yêu cầu)**

### **1. Validation Khi Chốt Ca** ❌ CHƯA LÀM
```typescript
// shifts.service.ts - closeShift()
// CẦN THÊM: Validate trước khi lưu debt_ledger
async closeShift(dto, user) {
  // ❌ CHƯA CÓ: Validate hạn mức
  // ❌ CHƯA CÓ: Validate khách thuộc store

  // ... tiếp tục logic chốt ca
}
```

### **2. Validation Khi Sửa Ca** ❌ CHƯA LÀM
```typescript
// shifts.service.ts - update()
// CẦN THÊM: Validate trước khi xóa và tạo lại
async update(id, dto, user) {
  // ❌ CHƯA CÓ: Validate hạn mức (loại trừ ca đang sửa)
  // ❌ CHƯA CÓ: Validate khách thuộc store

  // ... tiếp tục xóa và tạo lại
}
```

### **3. Nhập Số Dư Đầu Kỳ** ❌ CHƯA LÀM
```
CẦN XÂY DỰNG:
- API: POST /opening-balance/import
- UI: Trang nhập số dư đầu kỳ
- Logic: Tạo debt_ledger với ref_type = 'OPENING_BALANCE'
```

---

## 📊 **DATABASE CHANGES**

### **Migration Đã Chạy:**
```sql
✅ ALTER TABLE customer_stores
   ADD COLUMN credit_limit NUMERIC(15,2) NULL;

✅ COMMENT ON COLUMN customer_stores.credit_limit
   IS 'Hạn mức công nợ riêng của khách tại cửa hàng này';
```

### **Dữ Liệu Mẫu:**
```sql
-- Khách hàng A
customer_id = 1, credit_limit = 50,000,000 (mặc định)

-- Hạn mức riêng
customer_stores:
  (customer_id=1, store_id=1, credit_limit=10,000,000) -- CH HN
  (customer_id=1, store_id=2, credit_limit=20,000,000) -- CH HCM
  (customer_id=1, store_id=3, credit_limit=NULL)       -- CH ĐN (dùng 50tr)
```

---

## 🧪 **TEST CASES**

### **Test 1: Hạn mức riêng override mặc định**
```
✅ Setup:
   - Customer.creditLimit = 50tr
   - CustomerStore(store=1).creditLimit = 10tr

✅ Expected:
   - getEffectiveCreditLimit(customer, store=1) = 10tr
   - getEffectiveCreditLimit(customer, store=2) = 50tr
```

### **Test 2: NULL = dùng mặc định**
```
✅ Setup:
   - Customer.creditLimit = 50tr
   - CustomerStore(store=1).creditLimit = NULL

✅ Expected:
   - getEffectiveCreditLimit(customer, store=1) = 50tr
```

### **Test 3: Báo cáo filter theo store**
```
✅ Setup:
   - User: storeId = 2
   - Customer A: có trong customer_stores(store=2)
   - Customer B: KHÔNG có trong customer_stores(store=2)

✅ Expected:
   - getAllCreditStatus(storeId=2) chỉ trả về Customer A
```

---

## 🎯 **CHECKLIST HOÀN THÀNH**

### **Backend:**
- [x] Entity: Thêm creditLimit vào CustomerStore
- [x] DTO: CreateUpdateStoreCreditLimitDto
- [x] Service: getStoreCreditLimits()
- [x] Service: updateStoreCreditLimit()
- [x] Service: getEffectiveCreditLimit()
- [x] Service: validateDebtLimit()
- [x] Controller: API endpoints
- [x] Module: Import Store entity
- [x] Reports: Filter theo store trong getAllCreditStatus()

### **Frontend:**
- [x] API: Thêm interfaces & methods
- [x] CustomersPage: Button "Hạn mức"
- [x] CustomersPage: Modal quản lý hạn mức
- [x] CustomersPage: Table với inline editing
- [x] CustomersPage: Loading & error states
- [x] CustomersPage: Color-coded warnings
- [x] CustomerCreditPage: Tự động filter theo user.storeId

### **Chưa làm (theo yêu cầu):**
- [ ] Validation chốt ca
- [ ] Validation sửa ca
- [ ] Nhập số dư đầu kỳ

---

## 📝 **HƯỚNG DẪN SỬ DỤNG**

### **1. Thiết lập hạn mức cho khách hàng:**
```
Bước 1: Vào "Quản lý khách hàng"
Bước 2: Tìm khách cần thiết lập
Bước 3: Click nút "Hạn mức" (màu xanh lá)
Bước 4: Trong modal:
  - Xem hạn mức mặc định
  - Click "Sửa" ở store cần thiết lập
  - Nhập số tiền hoặc để trống (dùng mặc định)
  - Click "Lưu"
Bước 5: Click "Đóng"
```

### **2. Xem báo cáo công nợ:**
```
Admin/Director:
- Vào "Báo cáo hạn mức công nợ"
- Thấy TẤT CẢ khách hàng
- Hạn mức hiển thị theo từng cửa hàng

Store User:
- Vào "Báo cáo hạn mức công nợ"
- CHỈ thấy khách hàng của cửa hàng mình
- Hạn mức = riêng của store hoặc mặc định
```

---

## 🔍 **TROUBLESHOOTING**

### **Lỗi: "Không thấy dữ liệu trong modal"**
```
Nguyên nhân: Khách hàng chưa có trong customer_stores
Giải pháp: Backend đã sửa để hiển thị TẤT CẢ stores
```

### **Lỗi: "TypeScript error - creditLimit undefined"**
```
Nguyên nhân: dto.creditLimit có thể undefined
Giải pháp: Đã sửa dùng ?? null
```

---

## 📚 **TÀI LIỆU THAM KHẢO**

- [CREDIT_LIMIT_BY_STORE_GUIDE.md](cci:1://file:///home/seth/WorkSpace/SWP/SWP/CREDIT_LIMIT_BY_STORE_GUIDE.md:0:0-0:0) - Hướng dẫn chi tiết
- [Backend API Documentation](cci:1://file:///home/seth/WorkSpace/SWP/SWP/BackEnd/src/customers/customers.controller.ts:0:0-0:0)
- [Frontend Components](cci:1://file:///home/seth/WorkSpace/SWP/SWP/FrontEnd/src/pages/CustomersPage.tsx:0:0-0:0)

---

**Tác giả:** GitHub Copilot
**Ngày:** 2026-01-13
**Version:** 1.0
