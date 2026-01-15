# Hướng dẫn sử dụng API Báo cáo Xuất hàng theo Khách hàng

## Endpoint mới đã được thêm

### GET /reports/sales/by-customer

Endpoint này cho phép lọc báo cáo xuất hàng theo khách hàng (bao gồm khách hàng nội bộ và bên ngoài).

## Tham số (Query Parameters)

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `storeId` | number | Không | Lọc theo cửa hàng (nếu user không phải STORE) |
| `customerId` | number | Không | Lọc theo khách hàng cụ thể |
| `fromDate` | string (YYYY-MM-DD) | Không | Ngày bắt đầu |
| `toDate` | string (YYYY-MM-DD) | Không | Ngày kết thúc |
| `priceId` | number | Không | Lọc theo kỳ giá |

## Ví dụ sử dụng

### 1. Lấy tất cả doanh số bán hàng của 1 khách hàng cụ thể

```bash
GET /reports/sales/by-customer?customerId=5&fromDate=2024-01-01&toDate=2024-12-31
```

### 2. Lấy doanh số tất cả khách hàng của 1 cửa hàng

```bash
GET /reports/sales/by-customer?storeId=1&fromDate=2024-01-01&toDate=2024-12-31
```

### 3. Lấy doanh số của khách hàng nội bộ (ví dụ: cửa hàng trưởng)

```bash
GET /reports/sales/by-customer?customerId=10&storeId=1&fromDate=2024-01-01&toDate=2024-01-31
```

## Cấu trúc Response

```typescript
[
  {
    "customerId": 5,
    "customerCode": "KH001",
    "customerName": "Nguyễn Văn A",
    "customerType": "EXTERNAL", // hoặc "INTERNAL"
    "products": [
      {
        "productId": 1,
        "productName": "Xăng RON 95",
        "quantity": 1000.5,
        "unitPrice": 25000,
        "amount": 25012500,
        "saleType": "DEBT"
      },
      {
        "productId": 2,
        "productName": "Dầu DO",
        "quantity": 500.25,
        "unitPrice": 22000,
        "amount": 11005500,
        "saleType": "DEBT"
      }
    ],
    "totalQuantity": 1500.75,
    "totalAmount": 36018000
  }
]
```

## Sử dụng trong Frontend

```typescript
import { reportsApi } from '../api/reports';

// Lấy báo cáo theo khách hàng
const report = await reportsApi.getSalesByCustomer({
  storeId: 1,
  customerId: 5,
  fromDate: '2024-01-01',
  toDate: '2024-12-31',
});

console.log(report); // Danh sách khách hàng với chi tiết sản phẩm
```

## Lưu ý quan trọng

1. **Khách hàng nội bộ (INTERNAL)**: Đây là các nhân viên/cửa hàng trưởng được gán lượng bán lẻ để dễ quản lý
2. **Khách hàng bên ngoài (EXTERNAL)**: Khách hàng công nợ thông thường
3. **saleType**:
   - `DEBT`: Bán công nợ (từ shift_debt_sales)
   - `RETAIL`: Bán lẻ (nếu có gán cho khách hàng nội bộ)
4. Hiện tại chỉ hỗ trợ bán công nợ (DEBT), bán lẻ gán cho khách hàng có thể được mở rộng sau

## Testing với cURL

```bash
# Test với customerId cụ thể
curl -X GET "http://localhost:3000/reports/sales/by-customer?customerId=5&fromDate=2024-01-01&toDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test với storeId
curl -X GET "http://localhost:3000/reports/sales/by-customer?storeId=1&fromDate=2024-01-01&toDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Quyền truy cập

Endpoint này yêu cầu một trong các vai trò sau:
- STORE
- SALES
- ACCOUNTING
- DIRECTOR
- ADMIN

**Lưu ý**: User có role STORE chỉ có thể xem báo cáo của cửa hàng mình, không phụ thuộc vào tham số storeId.
