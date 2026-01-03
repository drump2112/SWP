# Hướng dẫn Quản lý Bồn bể và Vòi bơm

## 🎯 Tổng quan

Hệ thống cung cấp **2 cách** để quản lý bồn bể (tanks) và vòi bơm (pumps):

### 1️⃣ Quản lý Tập trung (Recommended cho Admin)
- **Trang Bồn bể** (`/tanks`): Quản lý tất cả bồn bể của toàn hệ thống
- **Trang Vòi bơm** (`/pumps`): Quản lý tất cả vòi bơm của toàn hệ thống
- Có thể lọc theo cửa hàng
- Tìm kiếm nhanh theo mã/tên

### 2️⃣ Quản lý Theo Cửa hàng (Recommended cho Store Manager)
- Vào **Trang Cửa hàng** (`/stores`)
- Click icon "mắt" 👁️ để xem chi tiết cửa hàng
- Trong trang chi tiết có 2 tabs:
  - **Tab Bồn bể**: Quản lý bồn bể của cửa hàng đó
  - **Tab Vòi bơm**: Quản lý vòi bơm của cửa hàng đó

---

## 📂 Cấu trúc File

### Backend
- **Controllers**:
  - `BackEnd/src/tanks/tanks.controller.ts`
  - `BackEnd/src/pumps/pumps.controller.ts`
- **Services**:
  - `BackEnd/src/tanks/tanks.service.ts`
  - `BackEnd/src/pumps/pumps.service.ts`
- **Entities**:
  - `BackEnd/src/entities/tank.entity.ts`
  - `BackEnd/src/entities/pump.entity.ts`
- **DTOs**:
  - `BackEnd/src/tanks/tanks.dto.ts`
  - `BackEnd/src/pumps/pumps.dto.ts`

### Frontend
- **Pages**:
  - `FontEnd/src/pages/TanksPage.tsx` - Trang quản lý tập trung bồn bể
  - `FontEnd/src/pages/PumpsPage.tsx` - Trang quản lý tập trung vòi bơm
  - `FontEnd/src/pages/StoreDetailPage.tsx` - Trang chi tiết cửa hàng
- **Components**:
  - `FontEnd/src/components/StoreDetailTabs.tsx` - Tabs bồn bể/vòi bơm
- **API Services**:
  - `FontEnd/src/api/tanks.ts`
  - `FontEnd/src/api/pumps.ts`
- **Routes**: Đã cấu hình trong `App.tsx`
- **Navigation**: Đã thêm vào `Sidebar.tsx`

---

## 🔌 API Endpoints

### Tanks (Bồn bể)
- `GET /tanks` - Lấy tất cả bồn bể
- `GET /tanks/store/:storeId` - Lấy bồn bể theo cửa hàng
- `GET /tanks/:id` - Lấy chi tiết một bồn
- `POST /tanks` - Tạo bồn mới (ADMIN)
- `PUT /tanks/:id` - Cập nhật bồn (ADMIN)
- `DELETE /tanks/:id` - Xóa bồn (ADMIN)

### Pumps (Vòi bơm)
- `GET /pumps` - Lấy tất cả vòi bơm
- `GET /pumps/store/:storeId` - Lấy vòi bơm theo cửa hàng
- `GET /pumps/tank/:tankId` - Lấy vòi bơm theo bồn
- `GET /pumps/:id` - Lấy chi tiết một vòi
- `POST /pumps` - Tạo vòi mới (ADMIN)
- `PUT /pumps/:id` - Cập nhật vòi (ADMIN)
- `DELETE /pumps/:id` - Xóa vòi (ADMIN)

---

## 📊 Cấu trúc Dữ liệu

### Tank (Bồn bể)
```typescript
{
  id: number;
  storeId: number;          // ID cửa hàng
  tankCode: string;         // Mã bồn (unique)
  name: string;             // Tên bồn
  capacity: number;         // Dung tích tối đa (lít)
  productId: number;        // Sản phẩm (xăng/dầu)
  currentStock: number;     // Tồn kho hiện tại (lít)
  isActive: boolean;        // Đang hoạt động?
}
```

### Pump (Vòi bơm)
```typescript
{
  id: number;
  storeId: number;          // ID cửa hàng
  tankId: number;           // ID bồn chứa
  pumpCode: string;         // Mã vòi (unique)
  name: string;             // Tên vòi
  productId: number;        // Sản phẩm (xăng/dầu)
  isActive: boolean;        // Đang hoạt động?
}
```

---

## 🎨 Tính năng Frontend

### Trang Quản lý Bồn bể (`/tanks`)
✅ Hiển thị danh sách tất cả bồn bể
✅ Tìm kiếm theo tên/mã bồn
✅ Lọc theo cửa hàng
✅ Thêm/Sửa/Xóa bồn bể
✅ Hiển thị: Mã, Tên, Cửa hàng, Sản phẩm, Dung tích, Tồn kho, Trạng thái

### Trang Quản lý Vòi bơm (`/pumps`)
✅ Hiển thị danh sách tất cả vòi bơm
✅ Tìm kiếm theo tên/mã vòi
✅ Lọc theo cửa hàng
✅ Thêm/Sửa/Xóa vòi bơm
✅ Tự động lọc bồn bể theo cửa hàng đã chọn
✅ Hiển thị: Mã, Tên, Cửa hàng, Bồn bể, Sản phẩm, Trạng thái

### Trang Chi tiết Cửa hàng (`/stores/:id`)
✅ Thông tin tổng quan cửa hàng
✅ Tab "Bồn bể": Quản lý bồn của cửa hàng này
✅ Tab "Vòi bơm": Quản lý vòi của cửa hàng này
✅ Thêm/Sửa/Xóa trực tiếp trong tabs
✅ Form gọn nhẹ, UX tốt hơn

---

## 🔐 Phân quyền

### Xem (GET)
- Tất cả: ADMIN, DIRECTOR
- Theo cửa hàng: ADMIN, DIRECTOR, STORE

### Thêm/Sửa/Xóa (POST/PUT/DELETE)
- Chỉ ADMIN

---

## 🚀 Hướng dẫn Sử dụng

### Cách 1: Quản lý Tập trung (Admin)

#### Quản lý Bồn bể:
1. Vào menu **"Bồn bể"** trên sidebar
2. Click **"Thêm bồn bể"**
3. Điền thông tin:
   - Chọn cửa hàng
   - Nhập mã bồn (VD: TANK-001)
   - Nhập tên bồn (VD: Bồn xăng 95)
   - Chọn sản phẩm (chỉ hiện nhiên liệu)
   - Nhập dung tích (lít)
   - Nhập tồn kho ban đầu
   - Chọn "Đang hoạt động"
4. Click **"Thêm mới"**

#### Quản lý Vòi bơm:
1. Vào menu **"Vòi bơm"** trên sidebar
2. Click **"Thêm vòi bơm"**
3. Điền thông tin:
   - Chọn cửa hàng (bồn bể sẽ tự lọc theo cửa hàng)
   - Chọn bồn bể
   - Nhập mã vòi (VD: PUMP-001)
   - Nhập tên vòi (VD: Vòi số 1)
   - Chọn sản phẩm
   - Chọn "Đang hoạt động"
4. Click **"Thêm mới"**

### Cách 2: Quản lý Theo Cửa hàng (Store Manager)

1. Vào menu **"Cửa hàng"**
2. Tìm cửa hàng cần quản lý
3. Click icon **👁️ (mắt)** ở cột "Thao tác"
4. Trong trang chi tiết cửa hàng:

   **Tab Bồn bể:**
   - Click "Thêm bồn bể"
   - Điền thông tin (không cần chọn cửa hàng, tự động lấy)
   - Lưu

   **Tab Vòi bơm:**
   - Click "Thêm vòi bơm"
   - Chọn bồn bể (chỉ hiện bồn của cửa hàng này)
   - Điền thông tin
   - Lưu

---

## 💡 Best Practices

### Khi Setup Cửa hàng Mới:
1. **Tạo cửa hàng** trước
2. **Thêm bồn bể** cho cửa hàng
3. **Thêm vòi bơm** gắn với bồn bể

### Quy tắc Đặt tên:
- **Mã bồn**: TANK-001, TANK-002, TANK-HN-001
- **Tên bồn**: Bồn xăng 95, Bồn dầu DO, Bồn xăng E5
- **Mã vòi**: PUMP-001, PUMP-002, PUMP-HN-001
- **Tên vòi**: Vòi số 1, Vòi số 2, Vòi xăng 95 - 01

### Quan hệ Dữ liệu:
```
Store (Cửa hàng)
  └── Tank (Bồn bể) - có nhiều
      └── Pump (Vòi bơm) - có nhiều
```

- Một cửa hàng có nhiều bồn bể
- Một bồn bể có nhiều vòi bơm
- Một vòi chỉ thuộc một bồn
- Một bồn chỉ chứa một loại sản phẩm

---

## ⚠️ Lưu ý

1. **Không thể xóa bồn** nếu còn vòi bơm đang gắn với nó
2. **Không thể xóa cửa hàng** nếu còn bồn bể
3. **Mã bồn/vòi** phải unique trong hệ thống
4. **Sản phẩm** của vòi bơm nên trùng với sản phẩm của bồn chứa
5. **Tồn kho** không được vượt quá dung tích
6. **Chỉ ADMIN** mới có quyền thêm/sửa/xóa

---

## 🐛 Troubleshooting

### Không thấy menu "Bồn bể" hoặc "Vòi bơm"
- Kiểm tra đã đăng nhập chưa
- Kiểm tra quyền user (cần ADMIN hoặc DIRECTOR)

### Lỗi "Unauthorized" khi thêm/sửa/xóa
- Chỉ ADMIN mới có quyền
- Kiểm tra token còn hạn không

### Không thấy bồn bể khi thêm vòi bơm
- Đảm bảo đã chọn cửa hàng trước
- Kiểm tra cửa hàng đó có bồn bể nào đang hoạt động không

### Lỗi khi xóa bồn bể
- Kiểm tra xem có vòi bơm nào đang gắn với bồn không
- Xóa vòi bơm trước, sau đó mới xóa bồn

---

## 📸 Screenshots Flow

### Flow Setup Cửa hàng mới:
```
1. Stores Page → Click "Thêm cửa hàng" → Tạo cửa hàng
                              ↓
2. Stores Page → Click icon 👁️ → Vào Store Detail
                              ↓
3. Store Detail → Tab "Bồn bể" → Thêm bồn bể
                              ↓
4. Store Detail → Tab "Vòi bơm" → Thêm vòi bơm
                              ↓
5. ✅ Hoàn tất setup!
```

### Flow Quản lý Tập trung:
```
Admin → Sidebar "Bồn bể" → Tanks Page → CRUD operations
                    hoặc
Admin → Sidebar "Vòi bơm" → Pumps Page → CRUD operations
```

---

## 🎓 Video Demo (Nếu cần)
1. Setup cửa hàng mới từ đầu
2. Quản lý bồn bể tập trung
3. Quản lý vòi bơm theo cửa hàng
4. Edit và Delete

---

**Developed by:** QLXD Team
**Date:** January 2, 2026
**Version:** 1.0
