# Hướng Dẫn Sử Dụng: Nhập Số Dư Đầu Kỳ Sổ Quỹ

## 🎯 Mục Đích

Chức năng **Nhập Số Dư Đầu Kỳ Sổ Quỹ** cho phép thiết lập số dư ban đầu của quỹ tiền mặt tại cửa hàng khi:
- Khởi tạo hệ thống lần đầu
- Chuyển đổi từ hệ thống cũ sang hệ thống mới
- Điều chỉnh số liệu do sai sót hoặc kiểm kê

## 🔑 Quyền Truy Cập

- **ADMIN**: Có thể nhập cho tất cả cửa hàng
- **ACCOUNTING (Kế toán)**: Có thể nhập cho tất cả cửa hàng
- **STORE/DIRECTOR**: Không có quyền

## 📍 Vị Trí Chức Năng

**Menu:** Cài đặt → Số dư đầu sổ quỹ
**URL:** `/cash/opening-balance`

## 📋 Các Bước Thực Hiện

### 1. Chọn Cửa Hàng
- Nếu bạn là ADMIN/ACCOUNTING: Chọn cửa hàng từ dropdown
- Hệ thống sẽ tự động hiển thị **số dư hiện tại** của cửa hàng đó

### 2. Nhập Số Dư Đầu Kỳ Mong Muốn
- Nhập số tiền mong muốn (VD: 5,000,000 ₫)
- Hệ thống tự động tính **chênh lệch** so với số dư hiện tại:
  - 📈 **Tăng quỹ**: Nếu số dư mong muốn > số dư hiện tại
  - 📉 **Giảm quỹ**: Nếu số dư mong muốn < số dư hiện tại
  - ✅ **Không điều chỉnh**: Nếu bằng nhau

### 3. Chọn Ngày Hiệu Lực
- Chọn ngày bắt đầu áp dụng số dư này
- **Lưu ý**: Không được chọn ngày trong tương lai

### 4. Ghi Chú (Tùy chọn)
Nhập lý do điều chỉnh, ví dụ:
- "Số dư chuyển từ hệ thống cũ"
- "Điều chỉnh theo biên bản kiểm kê ngày 01/01/2026"

### 5. Lưu
- Nhấn **"💾 Lưu Số Dư Đầu Kỳ"**
- Hệ thống sẽ tạo bút toán điều chỉnh trong sổ quỹ

## 🔧 Cách Hoạt Động

### Nghiệp Vụ Backend

1. **Tính số dư hiện tại:**
```sql
SELECT SUM(cash_in - cash_out) FROM cash_ledger WHERE store_id = X
```

2. **Tính chênh lệch:**
```
adjustment = openingBalance - currentBalance
```

3. **Ghi sổ:**
- Nếu `adjustment > 0`: Tạo phiếu thu (cash_in)
- Nếu `adjustment < 0`: Tạo phiếu chi (cash_out)
- Ghi vào `cash_ledger` với `refType = 'OPENING_BALANCE'`

### Ví Dụ

**Tình huống:** Cửa hàng A đang có số dư = 0, cần nhập số dư đầu = 5 triệu

**Kết quả:**
```
Bút toán tạo ra:
- refType: OPENING_BALANCE
- cashIn: 5,000,000
- cashOut: 0
- Số dư sau khi lưu: 5,000,000
```

## ⚠️ Lưu Ý Quan Trọng

### ❌ KHÔNG nên:
- Nhập số dư đầu nhiều lần cho cùng một cửa hàng
- Điều chỉnh khi cửa hàng đã có nhiều giao dịch (nên kiểm tra kỹ)
- Nhập số âm

### ✅ NÊN:
- Kiểm tra kỹ số liệu trước khi lưu
- Ghi chú rõ ràng lý do điều chỉnh
- Chỉ thực hiện khi thực sự cần thiết

### 🛡️ Bảo Vệ
- Hệ thống **không cho phép** nhập 2 lần OPENING_BALANCE trong cùng 1 ngày
- Nếu đã có, cần xóa bút toán cũ hoặc chọn ngày khác

## 📊 Ảnh Hưởng Đến Báo Cáo

Sau khi nhập số dư đầu:
- **Báo cáo Sổ Quỹ** (`/reports/cash`): Sẽ thấy dòng OPENING_BALANCE
- **Số dư hiện tại**: Tự động cập nhật
- **Công thức tính vẫn đúng**:
  ```
  Số dư = SUM(cash_in - cash_out) // Bao gồm cả OPENING_BALANCE
  ```

## 🔍 Kiểm Tra Sau Khi Nhập

1. Vào **Báo cáo Sổ Quỹ** (`/reports/cash`)
2. Kiểm tra dòng đầu tiên có `refType = OPENING_BALANCE`
3. Xác nhận số dư hiện tại khớp với số dư đã nhập

## 📱 Giao Diện

### Các Trường Thông Tin:
| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Cửa hàng | ✅ | Chọn cửa hàng cần nhập số dư |
| Số dư đầu kỳ | ✅ | Số tiền mong muốn (>= 0) |
| Ngày hiệu lực | ✅ | Ngày bắt đầu tính (≤ hôm nay) |
| Ghi chú | ⭕ | Lý do điều chỉnh |

### Màu Sắc Chênh Lệch:
- 🟢 **Xanh lá**: Tăng quỹ
- 🔴 **Đỏ**: Giảm quỹ
- ⚪ **Xám**: Không thay đổi

## 🆘 Xử Lý Lỗi

### Lỗi: "Đã có số dư đầu kỳ cho ngày X"
**Nguyên nhân:** Đã tồn tại OPENING_BALANCE trong ngày đó
**Giải pháp:**
1. Chọn ngày khác, hoặc
2. Liên hệ ADMIN để xóa bút toán cũ

### Lỗi: "Vui lòng nhập số dư hợp lệ"
**Nguyên nhân:** Số dư < 0 hoặc không hợp lệ
**Giải pháp:** Nhập số >= 0

## 🔗 API Endpoint

```
POST /api/cash/opening-balance
Authorization: Bearer <token>
Role: ADMIN | ACCOUNTING

Request Body:
{
  "storeId": 1,
  "openingBalance": 5000000,
  "effectiveDate": "2026-01-01",
  "notes": "Số dư chuyển từ hệ thống cũ"
}

Response:
{
  "success": true,
  "message": "Đã tăng số dư quỹ",
  "data": {
    "storeId": 1,
    "previousBalance": 0,
    "targetBalance": 5000000,
    "adjustment": 5000000,
    "cashLedgerId": 123,
    "effectiveDate": "2026-01-01T00:00:00.000Z"
  }
}
```

## 📚 Files Liên Quan

### Backend:
- `BackEnd/src/cash/dto/opening-balance-cash.dto.ts` - DTO
- `BackEnd/src/cash/cash.service.ts` - Logic nghiệp vụ
- `BackEnd/src/cash/cash.controller.ts` - API endpoint

### Frontend:
- `FrontEnd/src/pages/CashOpeningBalance.tsx` - Giao diện
- `FrontEnd/src/api/cash.ts` - API client
- `FrontEnd/src/components/Sidebar.tsx` - Menu navigation

### Database:
- Table: `cash_ledger`
- RefType mới: `'OPENING_BALANCE'`

---

**Ngày tạo:** 12/01/2026
**Phiên bản:** 1.0
**Tác giả:** System Auto-Generated
