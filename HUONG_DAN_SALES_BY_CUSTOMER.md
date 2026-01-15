# Hướng dẫn Sử dụng Tính năng Báo cáo Xuất hàng theo Khách hàng

## Tổng quan

Tính năng này cho phép xem báo cáo chi tiết về lượng hàng xuất (bán) cho từng khách hàng, bao gồm:
- Khách hàng nội bộ (INTERNAL): Nhân viên/cửa hàng trưởng được gán lượng bán lẻ
- Khách hàng bên ngoài (EXTERNAL): Khách hàng công nợ thông thường

## Truy cập

URL: `/reports/sales-by-customer`

**Quyền truy cập**: STORE, SALES, ACCOUNTING, DIRECTOR, ADMIN

## Tính năng

### 1. Bộ lọc
- **Cửa hàng**: Lọc theo cửa hàng (với ADMIN/ACCOUNTING/SALES). User có role STORE tự động lọc theo cửa hàng của mình
- **Khách hàng**: Chọn khách hàng cụ thể hoặc xem tất cả
- **Khoảng thời gian**: Chọn từ ngày - đến ngày

### 2. Thống kê Tổng quan
- Số lượng khách hàng
- Tổng số lượng xuất (lít)
- Tổng doanh thu

### 3. Bảng Chi tiết
- Hiển thị danh sách khách hàng với:
  - Mã khách hàng
  - Tên khách hàng
  - Loại khách hàng (Nội bộ 🏠 / Bên ngoài)
  - Tổng số lượng
  - Tổng thành tiền

- Nhấp vào mỗi khách hàng để xem chi tiết sản phẩm:
  - Tên sản phẩm
  - Loại giao dịch (Bán nợ/Bán lẻ)
  - Số lượng
  - Đơn giá
  - Thành tiền

### 4. Xuất Excel
- Xuất báo cáo ra file Excel với định dạng chuẩn
- Bao gồm header, footer, và styling
- Tên file: `Bao_cao_xuat_hang_theo_khach_hang_YYYYMMDD_YYYYMMDD.xlsx`

### 5. In Báo cáo
- In báo cáo trực tiếp từ trình duyệt
- Có header, footer, và format chuẩn

## Ghi chú

1. **Màu sắc phân biệt**:
   - Khách hàng nội bộ: Màu cam/vàng nhạt
   - Khách hàng bên ngoài: Màu xanh lá nhạt

2. **Dữ liệu hiển thị**:
   - Chỉ tính các ca đã CLOSED
   - Hiện tại chỉ bao gồm bán công nợ (DEBT)
   - Bán lẻ gán cho khách hàng nội bộ có thể được bổ sung sau

3. **Hiệu suất**:
   - Dữ liệu được cache bởi React Query
   - Tự động refetch khi thay đổi bộ lọc

## Backend API

**Endpoint**: `GET /reports/sales/by-customer`

**Query Parameters**:
- `storeId` (optional): ID cửa hàng
- `customerId` (optional): ID khách hàng cụ thể
- `fromDate` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `toDate` (optional): Ngày kết thúc (YYYY-MM-DD)
- `priceId` (optional): Lọc theo kỳ giá

**Response Structure**:
```json
[
  {
    "customerId": 5,
    "customerCode": "KH001",
    "customerName": "Nguyễn Văn A",
    "customerType": "EXTERNAL",
    "products": [
      {
        "productId": 1,
        "productName": "Xăng RON 95",
        "quantity": 1000.5,
        "unitPrice": 25000,
        "amount": 25012500,
        "saleType": "DEBT"
      }
    ],
    "totalQuantity": 1000.5,
    "totalAmount": 25012500
  }
]
```

## Liên kết Menu

Để thêm vào menu navigation, cập nhật `DashboardLayout.tsx`:

```typescript
{
  name: "Xuất hàng theo KH",
  href: "/reports/sales-by-customer",
  icon: UsersIcon,
  roles: ["STORE", "SALES", "ACCOUNTING", "DIRECTOR", "ADMIN"],
}
```
