# Fuel Management System - Backend API

Hệ thống quản lý xăng dầu với kiến trúc Ledger-first, đảm bảo tính toàn vẹn dữ liệu.

## 🏗️ Kiến trúc

- **NestJS** - Framework backend
- **TypeORM** - ORM cho PostgreSQL
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Ledger-first** - Mọi biến động ghi qua ledger, không update trực tiếp

## 📦 Cài đặt

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start PostgreSQL with Docker
cd ..
docker compose up -d

# Run migration
psql -h localhost -U postgres -d fuel_management -f src/migrations/001_initial.sql
```

## 🚀 Chạy ứng dụng

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

API sẽ chạy tại: `http://localhost:3000/api`

## 📚 Module Structure

### 1. Auth Module (`/api/auth`)
- `POST /auth/login` - Đăng nhập

### 2. Users Module (`/api/users`)
- CRUD users (ADMIN only)

### 3. Stores Module (`/api/stores`)
- CRUD cửa hàng (ADMIN only)
- `GET /stores` - Danh sách cửa hàng

### 4. Regions Module (`/api/regions`)
- CRUD khu vực (ADMIN only)

### 5. Products Module (`/api/products`)
- CRUD sản phẩm
- **Quản lý giá:**
  - `POST /products/prices` - Tạo giá mới cho một sản phẩm (SALES, ADMIN)
  - `GET /products/:productId/price/:regionId` - Lấy giá hiện tại của sản phẩm theo khu vực
  - `GET /products/region/:regionId/prices` - Lấy tất cả giá của khu vực
  - `GET /products/:productId/price-history/:regionId` - Lịch sử giá sản phẩm theo khu vực

- **Quản lý giá theo khu vực (NEW):**
  - `POST /products/region-prices` - Set giá cho nhiều sản phẩm trong một khu vực (SALES, ADMIN)
    - Body: `{ regionId, prices: [{ productId, price }], validFrom, validTo? }`
    - Giá sẽ tự động áp dụng cho tất cả cửa hàng trong khu vực
  - `GET /products/:productId/prices-all-regions` - Lấy giá hiện tại của sản phẩm trên tất cả khu vực
  - `GET /products/:productId/price-by-store/:storeId` - Lấy giá sản phẩm cho cửa hàng (dựa trên khu vực)
  - `GET /products/store/:storeId/all-prices` - Lấy tất cả giá hiện tại của cửa hàng (dựa trên khu vực)
  - `PUT /products/prices/:priceId` - Cập nhật giá (SALES, ADMIN)
  - `DELETE /products/prices/:priceId` - Xóa giá (ADMIN)

### 6. Shifts Module (`/api/shifts`)
**Chức năng cửa hàng:**
- `POST /shifts` - Mở ca
- `POST /shifts/close` - Chốt ca (ghi pump readings → sales → inventory)
- `GET /shifts/report/:id` - Báo cáo ca
- `GET /shifts/store/:storeId` - Lịch sử ca của cửa hàng

### 7. Customers Module (`/api/customers`)
**Quản lý công nợ:**
- `POST /customers` - Thêm khách hàng
- `GET /customers` - Danh sách khách hàng
- `GET /customers/:id/balance` - Số dư công nợ
- `GET /customers/:id/statement` - Sổ công nợ chi tiết
- `POST /customers/debt-sale` - Bán hàng công nợ

### 8. Receipts Module (`/api/receipts`)
**Phiếu thu tiền:**
- `POST /receipts` - Lập phiếu thu (tiền bán hàng + thanh toán nợ)
- `GET /receipts/store/:storeId` - Phiếu thu của cửa hàng
- `GET /receipts/:id` - Chi tiết phiếu thu

### 9. Inventory Module (`/api/inventory`)
**Nhập xuất kho:**
- `POST /inventory/documents` - Lập phiếu nhập/xuất
- `GET /inventory/balance/:warehouseId` - Tồn kho theo kho
- `GET /inventory/report/:warehouseId` - Báo cáo tồn kho
- `GET /inventory/all-stores` - Tồn kho tất cả cửa hàng (SALES, ACCOUNTING)

### 10. Cash Module (`/api/cash`)
**Quỹ tiền mặt:**
- `GET /cash/balance/:storeId` - Số dư quỹ
- `GET /cash/ledger/:storeId` - Sổ quỹ
- `POST /cash/deposit` - Nộp tiền về công ty

### 11. Reports Module (`/api/reports`)
**Báo cáo tổng hợp:**
- `GET /reports/debt` - Báo cáo công nợ
- `GET /reports/sales?fromDate&toDate` - Báo cáo doanh thu
- `GET /reports/cash` - Báo cáo quỹ
- `GET /reports/inventory` - Báo cáo tồn kho
- `GET /reports/dashboard?fromDate&toDate` - Dashboard giám đốc

## 🔐 Phân quyền

### ADMIN
- CRUD tất cả bảng dữ liệu
- Quản lý users, stores, regions

### DIRECTOR (Giám đốc)
- Xem tất cả báo cáo
- Dashboard tổng quan
- Xem danh sách users

### SALES (Phòng kinh doanh)
- Điều chỉnh giá bán sản phẩm
- Áp dụng giá theo khu vực
- Theo dõi nhập xuất tồn tất cả cửa hàng
- Xem báo cáo công nợ, doanh thu, tồn kho

### ACCOUNTING (Phòng kế toán)
- Xem tất cả báo cáo tài chính
- Xem công nợ, quỹ tiền mặt
- Lập phiếu thu

### STORE (Cửa hàng)
- Mở/Chốt ca
- Kê công nợ trong ca
- Thêm khách hàng
- Lập phiếu thu
- Lập phiếu nộp tiền
- Lập phiếu nhập xuất
- Xem quỹ tiền mặt cửa hàng
- Xem báo cáo ca, nhập xuất tồn

## 🔄 Quy trình nghiệp vụ

### 1. Chốt ca (Store)
```
1. Nhập số liệu cột bơm (pump readings)
2. Hệ thống tự động:
   - Tính số lượng bán = end_value - start_value
   - Lấy giá bán theo region
   - Tạo sales records
   - Ghi inventory_ledger (xuất kho)
3. Đóng ca
```

### 2. Bán hàng công nợ (Store)
```
1. Chọn khách hàng
2. Nhập sản phẩm, số lượng
3. Hệ thống tự động:
   - Tạo sales records
   - Ghi debt_ledger (debit = phát sinh nợ)
```

### 3. Thu tiền (Store)
```
1. Lập phiếu thu (receipt)
2. Gồm:
   - Tiền bán hàng trong ca
   - Tiền khách thanh toán nợ
3. Hệ thống tự động:
   - Ghi debt_ledger (credit = thanh toán nợ)
   - Ghi cash_ledger (cash_in)
```

### 4. Nộp tiền về công ty (Store)
```
1. Tạo deposit
2. Hệ thống ghi cash_ledger (cash_out)
```

### 5. Điều chỉnh giá (Sales)
```
1. Set giá cho nhiều sản phẩm trong khu vực:
   POST /products/region-prices
   Body: {
     regionId: 1,
     prices: [
       { productId: 1, price: 25000 },
       { productId: 2, price: 24000 }
     ],
     validFrom: "2025-01-01T00:00:00Z",
     validTo: null (optional)
   }

2. Hệ thống tự động:
   - Đóng giá cũ (set valid_to = validFrom của giá mới)
   - Tạo giá mới cho từng sản phẩm
   - Giá áp dụng cho tất cả cửa hàng thuộc khu vực

3. Các cửa hàng trong khu vực sẽ tự động sử dụng giá mới
   khi:
   - Chốt ca (lấy giá theo regionId của store)
   - Bán hàng công nợ
   - Lập phiếu thu
```

### 6. Xem giá theo cửa hàng (Store, Sales)
```
GET /products/store/:storeId/all-prices
- Lấy tất cả giá hiện tại của cửa hàng
- Giá được lấy dựa trên khu vực của cửa hàng
- Kết quả bao gồm thông tin sản phẩm và khu vực
```

## 🧪 Test với Postman/cURL

### 1. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 2. Create Store (với token)
```bash
curl -X POST http://localhost:3000/api/stores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"code":"CH001","name":"Cửa hàng 1","regionId":1}'
```

## 📊 Database Schema

Xem file `src/migrations/001_initial.sql` để biết chi tiết schema.

Nguyên tắc:
1. ✅ Không update tồn/tiền/công nợ trực tiếp
2. ✅ Mọi biến động ghi qua LEDGER
3. ✅ Ca sai → tạo ADJUSTMENT, không sửa dữ liệu cũ

## 🔧 Development

```bash
# Generate new module
nest g module moduleName
nest g service moduleName
nest g controller moduleName

# Format code
npm run format

# Lint
npm run lint
```

## 📝 License

Private - Fuel Management System
