# Hướng Dẫn: Quản Lý Hạn Mức Công Nợ Theo Cửa Hàng

## 📋 Tổng Quan

Tính năng cho phép thiết lập hạn mức công nợ **riêng biệt** cho từng khách hàng tại mỗi cửa hàng.

### Ví dụ:
- **Khách hàng A** tại **CH1**: Hạn mức 10,000,000đ
- **Khách hàng A** tại **CH2**: Hạn mức 20,000,000đ
- **Khách hàng A** tại **CH3**: Dùng hạn mức mặc định

---

## 🗂️ Cấu Trúc Database

### Bảng `customer_stores`
```sql
ALTER TABLE customer_stores
ADD COLUMN credit_limit NUMERIC(15,2) NULL;
```

**Logic hoạt động:**
- `creditLimit = NULL` → Dùng hạn mức mặc định từ bảng `customers`
- `creditLimit = số cụ thể` → Dùng hạn mức riêng cho store này

---

## 🔧 Backend Implementation

### 1. **Entity: CustomerStore**
```typescript
@Entity('customer_stores')
export class CustomerStore {
  @PrimaryColumn({ name: 'customer_id' })
  customerId: number;

  @PrimaryColumn({ name: 'store_id' })
  storeId: number;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 15, scale: 2, nullable: true })
  creditLimit: number | null; // 👈 Hạn mức riêng
}
```

### 2. **API Endpoints**

#### **GET** `/customers/:customerId/store-credit-limits`
Lấy danh sách hạn mức của khách tại tất cả các store.

**Response:**
```json
{
  "customerId": 1,
  "customerName": "KH A",
  "customerCode": "KH00001",
  "defaultCreditLimit": null,
  "storeLimits": [
    {
      "storeId": 1,
      "storeName": "CH Hà Nội",
      "creditLimit": 10000000,        // Hạn mức riêng
      "defaultCreditLimit": null,     // Hạn mức mặc định
      "effectiveLimit": 10000000,     // Hạn mức hiệu lực (ưu tiên riêng)
      "currentDebt": 5000000,
      "availableCredit": 5000000,
      "creditUsagePercent": 50,
      "isOverLimit": false
    },
    {
      "storeId": 2,
      "storeName": "CH HCM",
      "creditLimit": 20000000,
      "effectiveLimit": 20000000,
      "currentDebt": 18000000,
      "availableCredit": 2000000,
      "creditUsagePercent": 90,
      "isOverLimit": false
    }
  ]
}
```

#### **PUT** `/customers/:customerId/stores/:storeId/credit-limit`
Cập nhật hạn mức riêng cho khách tại 1 store.

**Request:**
```json
{
  "creditLimit": 15000000  // hoặc null để dùng mặc định
}
```

#### **POST** `/customers/:customerId/validate-debt-limit`
Validate xem debt mới có vượt hạn mức không.

**Request:**
```json
{
  "storeId": 1,
  "newDebtAmount": 6000000
}
```

**Response:**
```json
{
  "isValid": false,
  "customerId": 1,
  "storeId": 1,
  "creditLimit": 10000000,
  "currentDebt": 5000000,
  "newDebtAmount": 6000000,
  "totalDebt": 11000000,
  "exceedAmount": 1000000,
  "message": "Vượt hạn mức 1,000,000đ"
}
```

### 3. **Service Methods**

```typescript
// Lấy hạn mức hiệu lực
async getEffectiveCreditLimit(customerId: number, storeId: number): Promise<number> {
  const customerStore = await CustomerStore.findOne({ customerId, storeId });

  // Ưu tiên hạn mức riêng
  if (customerStore?.creditLimit !== null) {
    return customerStore.creditLimit;
  }

  // Fallback về mặc định
  const customer = await Customer.findOne(customerId);
  return customer?.creditLimit ?? 0;
}

// Validate hạn mức
async validateDebtLimit(customerId: number, storeId: number, newDebt: number) {
  const currentDebt = await getDebtBalance(customerId, storeId);
  const creditLimit = await getEffectiveCreditLimit(customerId, storeId);
  const totalDebt = currentDebt + newDebt;

  return {
    isValid: totalDebt <= creditLimit,
    exceedAmount: Math.max(0, totalDebt - creditLimit),
    // ...
  };
}
```

---

## 🎨 Frontend Implementation

### 1. **Trang Quản Lý Khách Hàng**

Thêm button **"Hạn mức"** vào mỗi row:

```tsx
<button onClick={() => handleManageCreditLimit(customer)}>
  <CreditCardIcon /> Hạn mức
</button>
```

### 2. **Modal Quản Lý Hạn Mức**

```
┌────────────────────────────────────────────────────────┐
│  QUẢN LÝ HẠN MỨC CÔNG NỢ                               │
│  Khách hàng A (KH00001)                                │
├────────────────────────────────────────────────────────┤
│  📌 Hạn mức mặc định: 0đ (hoặc số tiền)                │
├────────────────────────────────────────────────────────┤
│  Cửa hàng     │ Hạn mức riêng │ Hiệu lực │ Nợ │ Còn lại│
├───────────────┼───────────────┼──────────┼────┼────────┤
│  CH1 - HN     │  10,000,000   │ 10tr     │ 5tr│ 5tr    │
│  CH2 - HCM    │  20,000,000   │ 20tr     │18tr│ 2tr ⚠️ │
│  CH3 - DN     │  [NULL]       │ 0tr      │ 0  │ 0      │
│               │  ↑ Dùng mặc định         │    │        │
└───────────────┴───────────────┴──────────┴────┴────────┘

[Đóng]
```

**Features:**
- ✅ Hiển thị hạn mức mặc định
- ✅ Xem/sửa hạn mức riêng cho từng store
- ✅ Hiển thị nợ hiện tại & còn lại
- ✅ % sử dụng với màu cảnh báo:
  - 🟢 < 70%: An toàn
  - 🟡 70-90%: Cảnh báo
  - 🟠 90-100%: Nguy hiểm
  - 🔴 > 100%: Vượt hạn mức

### 3. **Validation Khi Bán Nợ**

```typescript
// Trước khi tạo debt sale
const validation = await customersApi.validateDebtLimit(
  customerId,
  storeId,
  newDebtAmount
);

if (!validation.isValid) {
  showWarning(`
    ⚠️ VƯỢT HẠN MỨC CÔNG NỢ

    Khách hàng: ${customerName}
    Hạn mức: ${validation.creditLimit.toLocaleString()}đ
    Nợ hiện tại: ${validation.currentDebt.toLocaleString()}đ
    Nợ mới: ${validation.newDebtAmount.toLocaleString()}đ
    Tổng nợ: ${validation.totalDebt.toLocaleString()}đ
    Vượt: ${validation.exceedAmount.toLocaleString()}đ

    Tiếp tục? (Cần quyền Admin)
  `);
}
```

---

## 📝 Hướng Dẫn Sử Dụng

### **Bước 1: Thiết lập hạn mức**

1. Vào **Quản lý khách hàng**
2. Click button **"Hạn mức"** ở khách cần thiết lập
3. Modal hiển thị danh sách các cửa hàng
4. Click **"Sửa"** → Nhập số tiền → **"Lưu"**
   - Để trống = dùng hạn mức mặc định
   - Nhập số = hạn mức riêng cho store đó

### **Bước 2: Theo dõi công nợ**

- Cột **"Hạn mức hiệu lực"**: Hạn mức đang áp dụng
- Cột **"Nợ hiện tại"**: Tổng nợ chưa thanh toán
- Cột **"Còn lại"**: Số tiền còn được nợ thêm
- Cột **"Sử dụng"**: % đã sử dụng (có màu cảnh báo)

### **Bước 3: Khi bán nợ**

Hệ thống tự động:
1. Tính tổng nợ hiện tại tại store
2. Lấy hạn mức hiệu lực (riêng hoặc mặc định)
3. Kiểm tra: `TotalDebt <= CreditLimit`
4. Nếu vượt → Hiển thị cảnh báo (có thể bypass nếu Admin)

---

## 🔍 Test Cases

### Test 1: Hạn mức riêng override mặc định
```
Customer: creditLimit = 50tr (mặc định)
Store 1: creditLimit = 10tr (riêng)
Expected: Effective limit tại Store 1 = 10tr
```

### Test 2: Null = dùng mặc định
```
Customer: creditLimit = 50tr
Store 2: creditLimit = NULL
Expected: Effective limit tại Store 2 = 50tr
```

### Test 3: Validation vượt hạn mức
```
Store 1: Hạn mức = 10tr, Nợ hiện tại = 5tr
Bán nợ mới = 6tr
Expected: isValid = false, exceedAmount = 1tr
```

---

## 🚀 Migration Checklist

- [x] Run SQL: `ALTER TABLE customer_stores ADD COLUMN credit_limit NUMERIC(15,2) NULL`
- [x] Update entity `CustomerStore`
- [x] Create DTO `UpdateStoreCreditLimitDto`
- [x] Add service methods
- [x] Add controller endpoints
- [x] Update frontend API types
- [x] Add UI in CustomersPage
- [x] Test validation logic

---

## 📊 Lợi Ích

✅ **Linh hoạt**: Mỗi store tự do set hạn mức riêng
✅ **Dễ quản lý**: UI trực quan, dễ thao tác
✅ **An toàn**: Validate trước khi tạo nợ mới
✅ **Mở rộng**: Dễ thêm tính năng (warning threshold, payment terms, ...)
✅ **Hiệu suất**: Query đơn giản, không cần join nhiều bảng

---

## 🔗 API Endpoints Summary

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/customers/:id/store-credit-limits` | Lấy danh sách hạn mức theo store |
| PUT | `/customers/:id/stores/:storeId/credit-limit` | Cập nhật hạn mức riêng |
| POST | `/customers/:id/validate-debt-limit` | Validate hạn mức trước khi bán nợ |

---

**Tác giả:** GitHub Copilot
**Ngày:** 2026-01-13
