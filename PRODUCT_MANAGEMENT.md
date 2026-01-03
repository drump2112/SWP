# Hướng dẫn Quản lý Sản phẩm

## Tổng quan
Chức năng quản lý sản phẩm cho phép bạn tạo, chỉnh sửa, xóa và xem danh sách các sản phẩm trong hệ thống quản lý xăng dầu.

## Cấu trúc File

### Backend
- **Controller**: `BackEnd/src/products/products.controller.ts`
- **Service**: `BackEnd/src/products/products.service.ts`
- **Entity**: `BackEnd/src/entities/product.entity.ts`
- **DTOs**:
  - `BackEnd/src/products/dto/create-product.dto.ts`
  - `BackEnd/src/products/dto/create-product-price.dto.ts`

### Frontend
- **Page**: `FontEnd/src/pages/ProductsPage.tsx`
- **API**: `FontEnd/src/api/products.ts`
- **Route**: Đã được thêm vào `FontEnd/src/App.tsx`
- **Navigation**: Menu "Sản phẩm" trong `FontEnd/src/components/Sidebar.tsx`

## API Endpoints

### Products
- `GET /products` - Lấy danh sách tất cả sản phẩm
- `GET /products/:id` - Lấy chi tiết một sản phẩm
- `POST /products` - Tạo sản phẩm mới (Yêu cầu quyền: SALES, ADMIN)
- `PUT /products/:id` - Cập nhật sản phẩm (Yêu cầu quyền: SALES, ADMIN)
- `DELETE /products/:id` - Xóa sản phẩm (Yêu cầu quyền: ADMIN)

### Product Prices
- `POST /products/prices` - Tạo giá mới cho sản phẩm (Yêu cầu quyền: SALES, ADMIN)
- `GET /products/:productId/price/:regionId` - Lấy giá hiện tại
- `GET /products/:productId/price-history/:regionId` - Lấy lịch sử giá (Yêu cầu quyền: SALES, ACCOUNTING, DIRECTOR, ADMIN)
- `GET /products/region/:regionId/prices` - Lấy giá theo khu vực

## Cấu trúc Dữ liệu

### Product
```typescript
{
  id: number;
  code: string;       // Mã sản phẩm (duy nhất)
  name: string;       // Tên sản phẩm
  unit: string;       // Đơn vị tính (Lít, Kg, Thùng...)
  isFuel: boolean;    // Là nhiên liệu hay không
}
```

### ProductPrice
```typescript
{
  id: number;
  productId: number;
  regionId: number;
  price: number;
  validFrom: string;  // Ngày bắt đầu có hiệu lực
  validTo?: string;   // Ngày hết hiệu lực (tùy chọn)
}
```

## Tính năng Frontend

### Trang Quản lý Sản phẩm (`/products`)
1. **Danh sách sản phẩm**
   - Hiển thị tất cả sản phẩm trong bảng
   - Các cột: Mã SP, Tên sản phẩm, Đơn vị, Loại (Nhiên liệu/Hàng hóa)
   - Phân biệt màu sắc cho nhiên liệu và hàng hóa

2. **Tìm kiếm**
   - Tìm kiếm theo tên hoặc mã sản phẩm
   - Tìm kiếm real-time

3. **Thêm sản phẩm mới**
   - Click nút "Thêm sản phẩm"
   - Điền thông tin: Mã SP, Tên, Đơn vị tính
   - Chọn checkbox "Là nhiên liệu" nếu sản phẩm là xăng/dầu
   - Click "Thêm mới"

4. **Chỉnh sửa sản phẩm**
   - Click icon bút chì ở cột "Thao tác"
   - Cập nhật thông tin
   - Click "Cập nhật"

5. **Xóa sản phẩm**
   - Click icon thùng rác ở cột "Thao tác"
   - Xác nhận xóa
   - **Lưu ý**: Chỉ ADMIN mới có quyền xóa

## Phân quyền

- **Xem danh sách**: Tất cả người dùng đã đăng nhập
- **Thêm/Sửa sản phẩm**: SALES, ADMIN
- **Xóa sản phẩm**: Chỉ ADMIN
- **Xem lịch sử giá**: SALES, ACCOUNTING, DIRECTOR, ADMIN

## Cách chạy

### Backend
```bash
cd BackEnd
npm install
npm run start:dev
```

### Frontend
```bash
cd FontEnd
npm install
npm run dev
```

## Lưu ý

1. **Mã sản phẩm** phải là duy nhất trong hệ thống
2. **Đơn vị tính** là trường tùy chọn, có thể để trống
3. Khi xóa sản phẩm, cần đảm bảo không có dữ liệu liên quan (bơm, bồn chứa, hóa đơn...)
4. Giá sản phẩm được quản lý riêng theo từng khu vực
5. Khi tạo giá mới, giá cũ sẽ tự động được đóng (set validTo)

## Các tính năng mở rộng có thể phát triển

1. **Quản lý giá sản phẩm trực tiếp trên giao diện**
2. **Import/Export danh sách sản phẩm**
3. **Lọc theo loại sản phẩm (Nhiên liệu/Hàng hóa)**
4. **Phân trang cho danh sách lớn**
5. **Thống kê sản phẩm (số lượng, doanh thu...)**
6. **Quản lý hình ảnh sản phẩm**
7. **Mã vạch/QR code cho sản phẩm**

## Troubleshooting

### Lỗi "Unauthorized" khi thêm/sửa/xóa
- Kiểm tra token đăng nhập còn hạn không
- Kiểm tra quyền của user hiện tại

### Không thấy menu "Sản phẩm"
- Kiểm tra file `Sidebar.tsx` đã có navigation item chưa
- Refresh lại trang

### Lỗi khi gọi API
- Kiểm tra backend đã chạy chưa (port 8080)
- Kiểm tra database connection trong `.env`
- Xem console log để biết chi tiết lỗi
