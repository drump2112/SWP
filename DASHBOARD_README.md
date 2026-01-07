# 🎯 Dashboard Analytics - Hệ thống Quản lý Cửa hàng Xăng dầu

## 📋 Tổng quan

Dashboard Analytics được thiết kế đặc biệt cho các role quản lý (DIRECTOR, ADMIN, SALES, ACCOUNTING) để theo dõi hiệu suất toàn hệ thống qua các biểu đồ và metrics chi tiết.

### ✨ Điểm nổi bật

- **Dashboard phân quyền**: Hiển thị giao diện phù hợp với từng role
- **Biểu đồ tương tác**: Charts responsive với Recharts
- **Real-time metrics**: Dữ liệu cập nhật theo thời gian thực
- **So sánh hiệu suất**: Theo dõi % thay đổi so với kỳ trước
- **Mobile-friendly**: Responsive design cho mọi thiết bị

## 🚀 Cài đặt và Khởi động

### Backend

```bash
cd BackEnd
# Không cần cài đặt thêm, module đã được tích hợp sẵn
npm run start:dev
```

### Frontend

```bash
cd FrontEnd
# Cài đặt thư viện chart (nếu chưa cài)
npm install recharts @types/recharts

# Khởi động dev server
npm run dev
```

## 📊 Tính năng Dashboard

### 1. Metrics Cards (Thẻ chỉ số KPI)

Hiển thị 4 chỉ số quan trọng:

- **💰 Tổng doanh thu**: Doanh thu trong khoảng thời gian đã chọn
- **📊 Số ca đã chốt**: Tổng số ca làm việc hoàn thành
- **🛒 Số giao dịch**: Tổng số đơn hàng bán hàng
- **👥 Khách hàng công nợ**: Số lượng khách có công nợ

Mỗi metric hiển thị:
- Giá trị hiện tại
- % thay đổi so với kỳ trước (tự động tính)
- Icon màu sắc phân biệt
- Arrow up/down cho trend

### 2. Biểu đồ Doanh thu

#### 📈 Doanh thu 6 tháng gần nhất
- **Loại**: Line Chart
- **Dữ liệu**: Tổng doanh thu mỗi tháng
- **Chức năng**:
  - Theo dõi xu hướng doanh thu
  - Nhận diện tháng cao điểm/thấp điểm
  - Hover để xem chi tiết từng tháng

#### 📊 So sánh doanh thu giữa các cửa hàng
- **Loại**: Bar Chart
- **Dữ liệu**: Doanh thu từng cửa hàng trong kỳ
- **Chức năng**:
  - So sánh hiệu suất giữa các chi nhánh
  - Xác định cửa hàng hoạt động tốt nhất
  - Dữ liệu theo khoảng thời gian đã chọn

#### 📉 Xu hướng doanh thu từng cửa hàng
- **Loại**: Multi-line Chart
- **Dữ liệu**: Doanh thu mỗi cửa hàng qua 6 tháng
- **Chức năng**:
  - Theo dõi xu hướng từng chi nhánh
  - So sánh song song nhiều cửa hàng
  - Màu sắc phân biệt rõ ràng

### 3. Thông tin Tổng hợp

#### 📦 Tổng hàng tồn kho
- Giá trị tồn kho toàn hệ thống
- Phân tích theo từng chi nhánh (top 5)
- Tính tổng tự động

#### 🏆 Top sản phẩm bán chạy
- Top 5 sản phẩm có doanh thu cao nhất
- Hiển thị:
  - Tên sản phẩm
  - Doanh thu
  - Số lượng bán ra
- Badge ranking (1, 2, 3...)

#### 💳 Công nợ phải thu
- Tổng giá trị công nợ hệ thống
- Số lượng khách hàng có nợ
- Top 5 khách hàng nợ nhiều nhất
- Scroll để xem thêm

## 🔧 API Endpoints

### Backend - `/analytics`

#### GET `/analytics/overview`
Tổng quan các metrics quan trọng

**Query Params:**
- `fromDate` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `toDate` (optional): Ngày kết thúc (YYYY-MM-DD)

**Response:**
```json
{
  "revenue": {
    "current": 125000000,
    "previous": 110000000,
    "change": 13.64
  },
  "shifts": { ... },
  "sales": { ... },
  "debt": { ... }
}
```

#### GET `/analytics/revenue/monthly`
Doanh thu theo tháng

**Query Params:**
- `months` (optional, default: 6): Số tháng
- `storeId` (optional): Filter theo cửa hàng

**Response:**
```json
[
  {
    "month": "2026-01",
    "year": 2026,
    "monthNumber": 1,
    "revenue": 125000000
  }
]
```

#### GET `/analytics/revenue/by-store`
So sánh doanh thu giữa các cửa hàng

**Query Params:**
- `fromDate` (required)
- `toDate` (required)

#### GET `/analytics/revenue/store-trends`
Xu hướng doanh thu từng cửa hàng

**Query Params:**
- `months` (optional, default: 6)

#### GET `/analytics/inventory/total`
Tổng giá trị hàng tồn kho

#### GET `/analytics/sales/top-products`
Top sản phẩm bán chạy

**Query Params:**
- `fromDate` (required)
- `toDate` (required)
- `limit` (optional, default: 10)

#### GET `/analytics/debt/summary`
Tổng quan công nợ

#### GET `/analytics/performance/stores`
Hiệu suất hoạt động các cửa hàng

## 🎨 Frontend Components

### MetricCard
Thẻ hiển thị metric với icon và % thay đổi

**Props:**
```typescript
{
  title: string;
  value: string | number;
  change?: number;
  icon: IconComponent;
  iconColor?: string;
}
```

### RevenueChart
Line chart hiển thị doanh thu theo tháng

### StoreComparisonChart
Bar chart so sánh doanh thu các cửa hàng

### StoreTrendsChart
Multi-line chart xu hướng từng cửa hàng

## 👥 Phân quyền

### Role STORE
- Dashboard đơn giản (như cũ)
- Chỉ xem dữ liệu cửa hàng của mình
- Các thẻ metric cơ bản
- Hoạt động gần đây
- Thông báo

### Role SALES, ACCOUNTING, DIRECTOR, ADMIN
- Dashboard Analytics đầy đủ
- Xem dữ liệu toàn hệ thống
- Tất cả biểu đồ và charts
- So sánh giữa các cửa hàng
- Metrics nâng cao

## 🔒 Bảo mật

- Tất cả endpoints được bảo vệ bởi `@UseGuards(JwtAuthGuard, RolesGuard)`
- Phân quyền theo `@Roles()` decorator
- User STORE không thể access analytics endpoints

## 📱 Responsive Design

- **Desktop**: Grid layout đầy đủ 4 columns
- **Tablet**: 2 columns, charts stack vertical
- **Mobile**: 1 column, optimized cho màn hình nhỏ

## 🎯 Hướng dẫn Sử dụng

### Bước 1: Đăng nhập
Đăng nhập với tài khoản có role: DIRECTOR, ADMIN, SALES, hoặc ACCOUNTING

### Bước 2: Chọn thời gian
Sử dụng date picker ở góc trên phải để chọn khoảng thời gian cần xem

### Bước 3: Xem Dashboard
- Metrics cards tự động cập nhật
- Biểu đồ hiển thị dữ liệu theo thời gian đã chọn
- Hover vào charts để xem chi tiết
- Scroll xuống để xem thêm thông tin

## 🛠️ Công nghệ sử dụng

### Backend
- **NestJS**: Framework backend
- **TypeORM**: ORM cho database
- **PostgreSQL**: Database
- **JWT**: Authentication

### Frontend
- **React 19**: UI Framework
- **TypeScript**: Type safety
- **Recharts**: Chart library
- **TailwindCSS**: Styling
- **React Query**: Data fetching & caching
- **Heroicons**: Icon library

## 📈 Mở rộng tương lai

- [ ] Export báo cáo PDF/Excel
- [ ] Real-time updates với WebSocket
- [ ] Thêm filters nâng cao (theo region, product category)
- [ ] Dashboard customization cho từng user
- [ ] Push notifications cho alerts
- [ ] Drill-down vào chi tiết từ charts
- [ ] Comparison với cùng kỳ năm trước
- [ ] Forecasting doanh thu

## 🐛 Troubleshooting

### Lỗi: Cannot find module 'recharts'
```bash
cd FrontEnd
npm install recharts @types/recharts
```

### Lỗi: API không trả về dữ liệu
- Kiểm tra Backend đã khởi động chưa
- Verify JWT token còn hiệu lực
- Check role của user (phải là SALES/ACCOUNTING/DIRECTOR/ADMIN)

### Charts không hiển thị
- Clear browser cache
- Check console cho errors
- Verify data format từ API

## 📞 Support

Nếu gặp vấn đề, vui lòng:
1. Check file log của backend
2. Mở Developer Console trong browser
3. Verify API responses trong Network tab
4. Liên hệ team development

---

**Created with ❤️ for Petrol Station Management System**
