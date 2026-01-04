# 🛢️ Hệ Thống Quản Lý Xăng Dầu (Fuel Management System)

## 📁 Cấu Trúc Dự Án

```
QLXD/
├── BackEnd/          # NestJS API Server
│   ├── src/
│   │   ├── auth/           # Authentication & Authorization
│   │   ├── users/          # User management
│   │   ├── regions/        # Region management
│   │   ├── stores/         # Store management
│   │   ├── products/       # Product & pricing
│   │   ├── shifts/         # Shift management (store operations)
│   │   ├── customers/      # Customer & debt management
│   │   ├── receipts/       # Receipt management
│   │   ├── inventory/      # Inventory management
│   │   ├── cash/           # Cash ledger
│   │   ├── reports/        # Reporting module
│   │   ├── entities/       # TypeORM entities (23 entities)
│   │   ├── config/         # Configuration
│   │   └── migrations/     # Database migrations
│   ├── .env               # Environment variables
│   └── package.json
├── FrontEnd/         # React + Vite (Frontend - to be developed)
└── compose.yml       # PostgreSQL container
```

## ✨ Tính Năng Theo Role

### 🏪 STORE (Cửa hàng)
- ✅ Chốt ca (theo số liệu cột bơm)
- ✅ Kê công nợ trong ca
- ✅ Lập phiếu thu tiền (bán hàng + thanh toán nợ)
- ✅ Lập phiếu nộp tiền về công ty
- ✅ Lập phiếu nhập xuất
- ✅ Xem quỹ tiền mặt tại cửa hàng
- ✅ Xem báo cáo ca, nhập xuất tồn

### 💼 SALES (Phòng kinh doanh)
- ✅ Điều chỉnh giá bán mặt hàng
- ✅ Áp dụng giá theo khu vực
- ✅ Theo dõi nhập xuất tồn tất cả cửa hàng
- ✅ Theo dõi công nợ (cửa hàng + công ty)
- ✅ Theo dõi tồn kho công ty và cửa hàng

### 📊 ACCOUNTING (Phòng kế toán)
- ✅ Xem báo cáo tài chính
- ✅ Xem báo cáo công nợ
- ✅ Xem số liệu tài chính công ty và cửa hàng
- ✅ Xem quỹ tiền mặt

### 👔 DIRECTOR (Giám đốc)
- ✅ Dashboard tổng quan
- ✅ Báo cáo doanh thu, công nợ, tồn kho, quỹ
- ✅ Xem tất cả báo cáo
- ✅ Xem danh sách users

### ⚙️ ADMIN
- ✅ CRUD users, stores, regions, products
- ✅ Quản lý toàn bộ hệ thống

## 🚀 Quick Start

### 1. Start Database
```bash
cd QLXD
docker compose up -d
```

### 2. Setup Backend
```bash
cd BackEnd
npm install
npm run build

# Initialize database
./init-db.sh

# Start server
npm run start:dev
```

API sẽ chạy tại: `http://localhost:3000/api`

### 3. Test API
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 📖 API Documentation

Xem chi tiết tại: [BackEnd/API_DOCUMENTATION.md](BackEnd/API_DOCUMENTATION.md)

## 🏗️ Kiến Trúc

### Ledger-First Design
- ✅ **Không update** tồn/tiền/công nợ trực tiếp
- ✅ **Mọi biến động** ghi qua LEDGER
- ✅ **Ca sai** → tạo ADJUSTMENT, không sửa dữ liệu cũ

### Database Schema
- 23 bảng
- 4 Ledger tables:
  - `debt_ledger` - Sổ công nợ
  - `inventory_ledger` - Sổ kho
  - `cash_ledger` - Sổ quỹ
  - `audit_logs` - Audit trail

### Tech Stack
- **Backend**: NestJS + TypeORM + PostgreSQL
- **Auth**: JWT + bcrypt
- **Validation**: class-validator
- **Frontend**: React + Vite (coming soon)

## 📊 Database

### Connect to PostgreSQL
```bash
psql -h localhost -U postgres -d fuel_management
Password: 123456
```

### View Tables
```sql
\dt
SELECT * FROM roles;
SELECT * FROM users;
```

## 🔐 Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

## 📝 API Endpoints Summary

| Module | Endpoints | Roles |
|--------|-----------|-------|
| Auth | `POST /auth/login` | All |
| Users | `/users` CRUD | ADMIN, DIRECTOR |
| Stores | `/stores` CRUD | ADMIN |
| Regions | `/regions` CRUD | ADMIN |
| Products | `/products`, `/products/prices` | SALES, ADMIN |
| Shifts | `/shifts`, `/shifts/close` | STORE |
| Customers | `/customers`, `/customers/debt-sale` | STORE, SALES |
| Receipts | `/receipts` | STORE, ACCOUNTING |
| Inventory | `/inventory/documents`, `/inventory/balance` | STORE, SALES |
| Cash | `/cash/balance`, `/cash/deposit` | STORE, ACCOUNTING |
| Reports | `/reports/*` | SALES, ACCOUNTING, DIRECTOR |

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📦 Deployment

```bash
# Build
npm run build

# Production
npm run start:prod
```

## 🔧 Development

```bash
# Watch mode
npm run start:dev

# Debug mode
npm run start:debug
```

## 📚 Tài Liệu Kỹ Thuật

1. **Quy trình chốt ca**: [docs/shift-closing.md](docs/shift-closing.md) (TODO)
2. **Quy trình công nợ**: [docs/debt-management.md](docs/debt-management.md) (TODO)
3. **Quy trình kho**: [docs/inventory.md](docs/inventory.md) (TODO)

## 🤝 Contributing

Liên hệ team để được hướng dẫn contribute.

## 📄 License

Private - Fuel Management System © 2026
