# Fuel Management System - Frontend

Ứng dụng quản lý xăng dầu - Frontend React + Material-UI

## Công nghệ sử dụng

- React 19.2
- TypeScript 5.9
- Vite 7.2
- Material-UI v5
- React Router v7
- TanStack Query v5
- Axios
- Day.js

## Cài đặt

```bash
npm install
```

## Chạy ứng dụng

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: http://localhost:5173

## Build production

```bash
npm run build
```

## Cấu trúc thư mục

```
src/
├── api/              # API clients
│   ├── client.ts     # Axios instance với interceptors
│   ├── auth.ts       # Authentication API
│   ├── shifts.ts     # Shifts API
│   └── products.ts   # Products API
├── components/       # Shared components
│   ├── Layout.tsx    # Main layout với AppBar
│   └── ProtectedRoute.tsx  # Route protection
├── contexts/         # React contexts
│   └── AuthContext.tsx     # Authentication context
├── pages/            # Page components
│   ├── LoginPage.tsx       # Trang đăng nhập
│   └── ShiftClosurePage.tsx # Trang chốt ca
├── App.tsx          # App entry point
└── main.tsx         # Vite entry point
```

## Tính năng

### 1. Đăng nhập
- Trang đăng nhập với validation
- Lưu token vào localStorage
- Redirect sau khi đăng nhập thành công

### 2. Chốt ca
- Hiển thị danh sách ca
- Form nhập số liệu cột bơm (pump readings)
- Tính toán tự động số lượng bán
- Chốt ca và gửi dữ liệu lên API

### 3. Protected Routes
- Bảo vệ các route yêu cầu authentication
- Auto redirect về login nếu chưa đăng nhập

## API Configuration

File `.env`:
```
VITE_API_URL=http://localhost:3000/api
```

## Hướng dẫn sử dụng

1. **Đăng nhập**:
   - Mở http://localhost:5173
   - Đăng nhập với username/password (mặc định: admin/admin123)

2. **Chốt ca**:
   - Xem danh sách các ca đang mở
   - Click "Chốt ca" trên ca cần chốt
   - Nhập thông tin cột bơm:
     - Mã cột bơm
     - Sản phẩm
     - Số đầu (start value)
     - Số cuối (end value)
   - Có thể thêm nhiều cột bơm
   - Click "Chốt ca" để hoàn tất

## Kết nối Backend

Đảm bảo backend đang chạy tại http://localhost:3000

Xem thêm tại: `/home/seth/WorkSpace/QLXD/BackEnd/README.md`
