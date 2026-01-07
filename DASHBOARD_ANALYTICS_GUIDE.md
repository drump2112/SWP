# Dashboard Analytics - Hướng dẫn sử dụng

## Tổng quan

Dashboard mới được thiết kế cho các role quản lý (DIRECTOR, ADMIN, SALES, ACCOUNTING) để theo dõi hiệu suất toàn hệ thống. Role STORE vẫn sử dụng dashboard đơn giản như cũ.

## Tính năng chính

### 1. **Metrics Cards (Thẻ chỉ số)**
- **Tổng doanh thu**: Hiển thị doanh thu trong khoảng thời gian được chọn, so sánh với kỳ trước
- **Số ca đã chốt**: Tổng số ca làm việc đã chốt
- **Số giao dịch**: Tổng số giao dịch bán hàng
- **Khách hàng công nợ**: Số lượng khách hàng đang có công nợ

### 2. **Biểu đồ Doanh thu**
- **Doanh thu 6 tháng gần nhất**: Line chart hiển thị xu hướng doanh thu
- **So sánh doanh thu giữa các cửa hàng**: Bar chart so sánh hiệu suất các chi nhánh
- **Xu hướng doanh thu từng cửa hàng**: Multi-line chart theo dõi từng cửa hàng qua 6 tháng

### 3. **Thông tin Tổng hợp**
- **Tổng hàng tồn kho**: Giá trị tồn kho toàn hệ thống, phân tích theo chi nhánh
- **Top sản phẩm bán chạy**: 5 sản phẩm có doanh thu cao nhất
- **Công nợ phải thu**: Tổng công nợ và danh sách khách hàng nợ nhiều nhất

## API Endpoints

### Backend (NestJS)

#### Analytics Controller (`/analytics`)

1. **GET /analytics/overview**
   - Tổng quan metrics quan trọng
   - Params: `fromDate`, `toDate` (optional)
   - Response: Revenue, shifts, sales, debt metrics với % thay đổi

2. **GET /analytics/revenue/monthly**
   - Doanh thu theo tháng
   - Params: `months` (số tháng, default: 6), `storeId` (optional)

3. **GET /analytics/revenue/by-store**
   - So sánh doanh thu giữa các cửa hàng
   - Params: `fromDate`, `toDate`

4. **GET /analytics/revenue/store-trends**
   - Xu hướng doanh thu của từng cửa hàng
   - Params: `months` (default: 6)

5. **GET /analytics/inventory/total**
   - Tổng giá trị hàng tồn kho
   - Phân tích theo cửa hàng và sản phẩm

6. **GET /analytics/inventory/by-product**
   - Top sản phẩm tồn kho
   - Params: `limit` (default: 10)

7. **GET /analytics/sales/top-products**
   - Top sản phẩm bán chạy
   - Params: `fromDate`, `toDate`, `limit` (default: 10)

8. **GET /analytics/debt/summary**
   - Tổng quan công nợ
   - Trả về tổng nợ, số khách, top debtors

9. **GET /analytics/performance/stores**
   - Hiệu suất hoạt động các cửa hàng
   - Params: `fromDate`, `toDate`

### Frontend Components

1. **MetricCard**: Hiển thị thẻ chỉ số với icon và % thay đổi
2. **RevenueChart**: Line chart doanh thu theo tháng
3. **StoreComparisonChart**: Bar chart so sánh cửa hàng
4. **StoreTrendsChart**: Multi-line chart xu hướng từng cửa hàng

## Cài đặt

### Backend
```bash
# Module đã được thêm vào app.module.ts
# Không cần thêm bước nào
```

### Frontend
```bash
cd FrontEnd
npm install recharts @types/recharts
```

## Sử dụng

1. **Đăng nhập với role DIRECTOR, ADMIN, SALES, hoặc ACCOUNTING**
2. **Dashboard sẽ tự động hiển thị giao diện analytics**
3. **Chọn khoảng thời gian** ở góc trên bên phải để lọc dữ liệu
4. **Xem các biểu đồ và metrics** cập nhật theo thời gian thực

## Role-based Access

- **STORE**: Dashboard đơn giản (như cũ)
- **SALES, ACCOUNTING, DIRECTOR, ADMIN**: Dashboard analytics đầy đủ
- Tất cả API analytics được bảo vệ bởi `@Roles()` decorator

## Lưu ý

- Dữ liệu được cache bởi React Query
- Biểu đồ responsive và tương thích mobile
- Định dạng tiền tệ VND tự động
- So sánh % thay đổi với kỳ trước tự động tính toán

## Mở rộng

Có thể thêm:
- Export PDF/Excel reports
- Real-time updates với WebSocket
- Thêm filters nâng cao (theo region, product category)
- Dashboard customization cho từng user
- Push notifications cho alerts quan trọng
