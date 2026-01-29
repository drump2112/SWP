# 📖 HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ XĂNG DẦU
## (Fuel Management System - FMS)

---

# 📋 MỤC LỤC

1. [Giới thiệu chung](#1-giới-thiệu-chung)
2. [Đăng nhập hệ thống](#2-đăng-nhập-hệ-thống)
3. [Hướng dẫn cho Role STORE (Nhân viên cửa hàng)](#3-hướng-dẫn-cho-role-store-nhân-viên-cửa-hàng)
4. [Hướng dẫn cho Role ADMIN (Quản trị viên)](#4-hướng-dẫn-cho-role-admin-quản-trị-viên)
5. [Các lưu ý quan trọng](#5-các-lưu-ý-quan-trọng)
6. [Câu hỏi thường gặp (FAQ)](#6-câu-hỏi-thường-gặp-faq)

---

# 1. GIỚI THIỆU CHUNG

## 1.1. Mục đích hệ thống

Hệ thống Quản lý Xăng Dầu (FMS) được thiết kế để:
- 📊 **Quản lý ca làm việc** - Mở/chốt ca, ghi nhận số liệu cột bơm
- 💰 **Quản lý công nợ** - Theo dõi khách hàng mua chịu, thu tiền
- 📦 **Quản lý tồn kho** - Nhập xuất hàng, kiểm kê
- 💵 **Quản lý quỹ tiền mặt** - Thu chi, nộp tiền công ty
- 📈 **Báo cáo tổng hợp** - Doanh thu, công nợ, tồn kho

## 1.2. Các vai trò trong hệ thống

| Vai trò | Mô tả | Phạm vi hoạt động |
|---------|-------|-------------------|
| **STORE** | Nhân viên cửa hàng | Chỉ cửa hàng được gán |
| **ADMIN** | Quản trị viên | Toàn bộ hệ thống |
| **DIRECTOR** | Giám đốc | Xem tất cả, không thao tác nghiệp vụ |
| **SALES** | Phòng Kinh doanh | Quản lý giá, công nợ, tồn kho |
| **ACCOUNTING** | Phòng Kế toán | Xem báo cáo tài chính |

---

# 2. ĐĂNG NHẬP HỆ THỐNG

## 2.1. Truy cập hệ thống

1. Mở trình duyệt web (Chrome, Firefox, Edge...)
2. Nhập địa chỉ hệ thống được cung cấp
3. Màn hình đăng nhập sẽ hiển thị

## 2.2. Thực hiện đăng nhập

![Login](https://via.placeholder.com/400x300?text=Màn+hình+đăng+nhập)

| Bước | Thao tác |
|------|----------|
| 1 | Nhập **Tên đăng nhập** (username) |
| 2 | Nhập **Mật khẩu** (password) |
| 3 | Nhấn nút **"Đăng nhập"** |

> ⚠️ **Lưu ý bảo mật:**
> - Không chia sẻ tài khoản với người khác
> - Đổi mật khẩu định kỳ
> - Đăng xuất khi rời máy tính

## 2.3. Đăng xuất

1. Nhấn vào **tên người dùng** ở góc phải màn hình
2. Chọn **"Đăng xuất"**

---

# 3. HƯỚNG DẪN CHO ROLE STORE (Nhân viên cửa hàng)

## 3.1. Tổng quan giao diện

Sau khi đăng nhập, bạn sẽ thấy:

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Trang chủ          Xin chào, [Tên bạn]!   👤 Đăng xuất │
├────────────────┬────────────────────────────────────────────┤
│                │                                            │
│  📋 Thanh menu │          NỘI DUNG CHÍNH                   │
│                │                                            │
│  • Trang chủ   │                                            │
│  • Quản lý ca  │                                            │
│  • Báo cáo     │                                            │
│                │                                            │
└────────────────┴────────────────────────────────────────────┘
```

### Menu dành cho STORE:

| Menu | Chức năng |
|------|-----------|
| **Trang chủ** | Màn hình chào mừng |
| **Quản lý ca** | Mở ca, thao tác ca, chốt ca |
| **Báo cáo** | Xem các báo cáo của cửa hàng |

---

## 3.2. QUẢN LÝ CA LÀM VIỆC ⭐

### 3.2.1. Mở ca mới

**Đường dẫn:** Menu → **Quản lý ca** → Nhấn nút **"+ Mở ca mới"**

| Bước | Thao tác | Mô tả |
|------|----------|-------|
| 1 | Chọn **Ngày làm việc** | Thường là ngày hiện tại |
| 2 | Chọn **Số ca** | Ca 1, Ca 2, Ca 3... |
| 3 | Nhập **Giờ mở ca** | Thời điểm bắt đầu ca |
| 4 | Nhấn **"Tạo ca"** | Hệ thống tạo ca mới |

> ✅ **Sau khi tạo ca:** Nhấn vào ca vừa tạo để vào màn hình **Thao tác ca**

---

### 3.2.2. Màn hình Thao tác Ca

Đây là màn hình chính để thực hiện các nghiệp vụ trong ca. Có **7 tab chức năng**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Cột bơm] [Công nợ] [Phiếu thu] [Nộp tiền] [Nhập hàng] [Xuất hàng] [Kiểm kê]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                        NỘI DUNG CỦA TAB ĐANG CHỌN                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 📟 TAB 1: CỘT BƠM (Pump Readings)

**Mục đích:** Ghi nhận số đồng hồ đầu/cuối ca của từng cột bơm

#### Khi mở ca:
| Cột | Ý nghĩa |
|-----|---------|
| Tên cột bơm | VD: Pump 01, Pump 02... |
| Mặt hàng | Loại xăng/dầu (RON95, DO 0.05S...) |
| Số đầu ca | Số tự động lấy từ cuối ca trước |

#### Khi chốt ca:

| Bước | Thao tác |
|------|----------|
| 1 | Kiểm tra số đầu ca có đúng không |
| 2 | Nhập **Số cuối ca** (đọc từ đồng hồ thực tế) |
| 3 | Hệ thống tự tính **Lượng bán** = Cuối ca - Đầu ca |

> ⚠️ **QUAN TRỌNG:**
> - Số cuối ca phải ≥ Số đầu ca
> - Kiểm tra kỹ trước khi chốt, không sửa được sau khi khóa ca

---

### 💳 TAB 2: CÔNG NỢ (Debt Sales)

**Mục đích:** Ghi nhận các giao dịch bán hàng công nợ (khách mua chịu)

#### Thêm giao dịch công nợ mới:

| Bước | Thao tác | Lưu ý |
|------|----------|-------|
| 1 | Nhấn **"+ Thêm công nợ"** | |
| 2 | Chọn **Khách hàng** | Từ danh sách khách được phép mua chịu |
| 3 | Chọn **Mặt hàng** | RON95, DO 0.05S... |
| 4 | Nhập **Số lượng** (lít) | |
| 5 | **Đơn giá** tự động hiển thị | Theo giá vùng hiện tại |
| 6 | **Thành tiền** tự tính | = Số lượng × Đơn giá |
| 7 | Nhập **Ghi chú** (nếu cần) | VD: Biển số xe |
| 8 | Nhấn **"Lưu"** | |

#### Danh sách công nợ trong ca:

| Cột | Ý nghĩa |
|-----|---------|
| STT | Số thứ tự |
| Khách hàng | Tên khách hàng |
| Mặt hàng | Loại xăng/dầu |
| Số lượng | Số lít đã bán |
| Đơn giá | Giá bán/lít |
| Thành tiền | Tổng tiền giao dịch |
| Thao tác | Sửa, Xóa (chỉ khi ca chưa khóa) |

> 💡 **Mẹo:** Nhấn Enter để chuyển nhanh giữa các ô nhập liệu

---

### 🧾 TAB 3: PHIẾU THU (Receipts)

**Mục đích:** Ghi nhận tiền thu được (tiền mặt, chuyển khoản, thanh toán nợ)

#### Các loại phiếu thu:

| Loại | Ý nghĩa | Khi nào dùng |
|------|---------|--------------|
| **Tiền mặt** 💵 | Khách trả tiền mặt | Bán hàng trực tiếp |
| **Chuyển khoản** 🏦 | Khách chuyển khoản | Thanh toán qua ngân hàng |
| **Thanh toán nợ** 💳 | Thu nợ từ khách | Khách trả nợ cũ |

#### Tạo phiếu thu tiền mặt/chuyển khoản:

| Bước | Thao tác |
|------|----------|
| 1 | Chọn loại: **Tiền mặt** hoặc **Chuyển khoản** |
| 2 | Nhập **Số tiền** |
| 3 | Nhập **Ghi chú** (tùy chọn) |
| 4 | Nhấn **"Lưu phiếu thu"** |

#### Tạo phiếu thu thanh toán nợ:

| Bước | Thao tác |
|------|----------|
| 1 | Chọn loại: **Thanh toán nợ** |
| 2 | Chọn **Khách hàng** (hệ thống hiện dư nợ) |
| 3 | Chọn **Phương thức**: Tiền mặt / Chuyển khoản |
| 4 | Nhập **Số tiền thanh toán** |
| 5 | Nhấn **"Lưu phiếu thu"** |

> ✅ Khi thanh toán nợ, hệ thống tự động giảm công nợ của khách hàng

---

### 🏧 TAB 4: NỘP TIỀN (Cash Deposit)

**Mục đích:** Ghi nhận tiền nộp về công ty

#### Tạo phiếu nộp tiền:

| Bước | Thao tác |
|------|----------|
| 1 | Nhập **Số tiền nộp** |
| 2 | Nhập **Ghi chú** (VD: Nộp tiền ngày 28/01) |
| 3 | Nhấn **"Nộp tiền"** |

> 📝 **Lưu ý:** Phiếu nộp tiền sẽ làm giảm số dư quỹ tiền mặt tại cửa hàng

---

### 📦 TAB 5: NHẬP HÀNG (Import)

**Mục đích:** Ghi nhận hàng nhập từ xe bồn

#### Tạo phiếu nhập hàng:

| Bước | Thao tác |
|------|----------|
| 1 | Chọn **Bồn chứa** nhập vào |
| 2 | Nhập **Số lượng** (lít) |
| 3 | Nhập **Số seal** (tem niêm phong) |
| 4 | Nhập **Biển số xe** |
| 5 | Nhập **Ghi chú** (tùy chọn) |
| 6 | Nhấn **"Nhập hàng"** |

> ✅ Hệ thống tự động cộng tồn kho bồn chứa

---

### 📤 TAB 6: XUẤT HÀNG (Export)

**Mục đích:** Ghi nhận xuất hàng (nếu có)

#### Tạo phiếu xuất hàng:

| Bước | Thao tác |
|------|----------|
| 1 | Chọn **Bồn chứa** xuất |
| 2 | Chọn **Lý do xuất** |
| 3 | Nhập **Số lượng** (lít) |
| 4 | Nhập **Ghi chú** |
| 5 | Nhấn **"Xuất hàng"** |

---

### 📋 TAB 7: KIỂM KÊ (Inventory Check)

**Mục đích:** Lập biên bản kiểm kê tồn kho cuối ca

#### Thực hiện kiểm kê:

| Bước | Thao tác | Mô tả |
|------|----------|-------|
| 1 | Xem **Tồn sổ sách** | Hệ thống tự tính từ nhập-xuất |
| 2 | Nhập **Tồn thực tế** | Đo/đếm thực tế tại bồn |
| 3 | Xem **Chênh lệch** | = Thực tế - Sổ sách |
| 4 | Nhấn **"Lưu biên bản"** | |

> ⚠️ Nếu chênh lệch lớn, cần ghi chú lý do để giải trình

---

### 3.2.3. Chốt ca

**Khi nào chốt ca?** Cuối ca làm việc, sau khi hoàn thành mọi giao dịch.

#### Các bước chốt ca:

| Bước | Thao tác |
|------|----------|
| 1 | Kiểm tra tất cả **số liệu cột bơm** đã nhập đúng |
| 2 | Kiểm tra các **phiếu thu, phiếu nộp** đã đầy đủ |
| 3 | Hoàn thành **kiểm kê** (nếu cần) |
| 4 | Nhấn nút **"🔒 Chốt ca"** |
| 5 | Xác nhận trong popup |

> ⚠️ **CHÚ Ý QUAN TRỌNG:**
> - Sau khi chốt ca, **KHÔNG THỂ SỬA** số liệu
> - Kiểm tra kỹ trước khi chốt
> - Nếu cần sửa, liên hệ Admin để mở lại ca

---

## 3.3. XEM BÁO CÁO

### Menu Báo cáo cho STORE:

| Báo cáo | Đường dẫn | Mục đích |
|---------|-----------|----------|
| **Báo cáo ca** | Báo cáo → Báo cáo ca | Xem chi tiết các ca đã chốt |
| **Sổ quỹ** | Báo cáo → Sổ quỹ | Xem thu chi tiền mặt |
| **Báo cáo công nợ** | Báo cáo → Báo cáo công nợ | Xem dư nợ khách hàng |
| **Doanh thu/Xuất hàng** | Báo cáo → Doanh thu/Xuất hàng | Xem doanh thu bán hàng |
| **Nhập Xuất Tồn** | Báo cáo → Nhập Xuất Tồn | Xem tồn kho |
| **Biên bản kiểm kê** | Báo cáo → Biên bản kiểm kê | Xem các biên bản kiểm kê |

---

## 3.4. QUY TRÌNH LÀM VIỆC HÀNG NGÀY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         QUY TRÌNH CA LÀM VIỆC                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🌅 ĐẦU CA                                                                  │
│  ┌─────────────┐                                                            │
│  │ 1. Đăng nhập│ → Vào hệ thống bằng tài khoản cá nhân                     │
│  └──────┬──────┘                                                            │
│         ▼                                                                   │
│  ┌─────────────────┐                                                        │
│  │ 2. Mở ca mới    │ → Chọn ngày, số ca, giờ mở ca                         │
│  └──────┬──────────┘                                                        │
│         ▼                                                                   │
│  ┌──────────────────────┐                                                   │
│  │ 3. Kiểm tra số đầu ca│ → Đối chiếu với số cuối ca trước                 │
│  └──────┬───────────────┘                                                   │
│         │                                                                   │
│  ───────┼───────────────────────────────────────────────────────────────    │
│         │                                                                   │
│  ⏰ TRONG CA                                                                │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │ 4. Ghi nhận giao dịch khi phát sinh:                        │           │
│  │    • Công nợ → Tab "Công nợ" → Thêm giao dịch               │           │
│  │    • Thu tiền → Tab "Phiếu thu" → Tạo phiếu                 │           │
│  │    • Nhập hàng → Tab "Nhập hàng" → Tạo phiếu                │           │
│  │    • Nộp tiền → Tab "Nộp tiền" → Tạo phiếu                  │           │
│  └──────┬──────────────────────────────────────────────────────┘           │
│         │                                                                   │
│  ───────┼───────────────────────────────────────────────────────────────    │
│         │                                                                   │
│  🌙 CUỐI CA                                                                 │
│         ▼                                                                   │
│  ┌──────────────────────┐                                                   │
│  │ 5. Nhập số cuối ca   │ → Tab "Cột bơm" → Nhập từng cột                  │
│  └──────┬───────────────┘                                                   │
│         ▼                                                                   │
│  ┌──────────────────────┐                                                   │
│  │ 6. Kiểm kê tồn kho   │ → Tab "Kiểm kê" → Nhập tồn thực tế              │
│  └──────┬───────────────┘                                                   │
│         ▼                                                                   │
│  ┌──────────────────────┐                                                   │
│  │ 7. Đối chiếu tiền mặt│ → Kiểm tiền thực tế với số dư quỹ               │
│  └──────┬───────────────┘                                                   │
│         ▼                                                                   │
│  ┌──────────────────────┐                                                   │
│  │ 8. CHỐT CA          │ → Nhấn "🔒 Chốt ca" → Xác nhận                    │
│  └──────┬───────────────┘                                                   │
│         ▼                                                                   │
│  ┌──────────────────────┐                                                   │
│  │ 9. Đăng xuất        │ → Thoát hệ thống                                  │
│  └──────────────────────┘                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 4. HƯỚNG DẪN CHO ROLE ADMIN (Quản trị viên)

## 4.1. Tổng quan giao diện Admin

Admin có quyền truy cập đầy đủ các chức năng:

```
📋 MENU ADMIN:
├── 🏠 Trang chủ (Dashboard)
├── ⏰ Quản lý ca
├── 📊 Báo cáo
│   ├── Báo cáo ca
│   ├── Sổ quỹ
│   ├── Báo cáo công nợ
│   ├── Hạn mức công nợ
│   ├── Doanh thu/Xuất hàng
│   ├── Nhập Xuất Tồn
│   ├── Biên bản kiểm kê
│   └── Chốt Tồn Kho
├── 📑 Danh mục
│   ├── Cửa hàng
│   ├── Mặt hàng
│   ├── Quản lý giá
│   ├── Khách hàng
│   └── Tài khoản
└── ⚙️ Cài đặt
    ├── Bồn bể
    ├── Vòi bơm
    ├── Hệ số hao hụt
    ├── Nhập tồn đầu
    ├── Số dư đầu sổ quỹ
    ├── Số dư đầu công nợ
    └── Hóa đơn
```

---

## 4.2. DASHBOARD (Trang chủ)

Admin thấy **Dashboard quản lý** với:

| Thông tin | Mô tả |
|-----------|-------|
| **Tổng doanh thu** | Doanh thu trong khoảng thời gian chọn |
| **Số lượng bán** | Tổng lít xăng dầu đã bán |
| **Tổng công nợ** | Dư nợ của tất cả khách hàng |
| **Số cửa hàng** | Tổng số cửa hàng trong hệ thống |
| **Biểu đồ doanh thu** | Xu hướng doanh thu theo tháng |
| **So sánh cửa hàng** | Doanh số giữa các cửa hàng |

---

## 4.3. QUẢN LÝ CỬA HÀNG

**Đường dẫn:** Danh mục → **Cửa hàng**

### 4.3.1. Xem danh sách cửa hàng

| Cột | Ý nghĩa |
|-----|---------|
| Mã | Mã định danh cửa hàng |
| Tên | Tên cửa hàng |
| Địa chỉ | Địa chỉ cửa hàng |
| Khu vực | Vùng miền (để áp dụng giá) |
| Trạng thái | Hoạt động / Ngừng hoạt động |

### 4.3.2. Thêm cửa hàng mới

| Bước | Thao tác |
|------|----------|
| 1 | Nhấn **"+ Thêm cửa hàng"** |
| 2 | Nhập **Mã cửa hàng** |
| 3 | Nhập **Tên cửa hàng** |
| 4 | Nhập **Địa chỉ** |
| 5 | Chọn **Khu vực** |
| 6 | Nhấn **"Lưu"** |

### 4.3.3. Xem chi tiết cửa hàng

Nhấn vào tên cửa hàng để xem:
- Thông tin cửa hàng
- Danh sách bồn bể
- Danh sách vòi bơm
- Nhân viên được gán

---

## 4.4. QUẢN LÝ NGƯỜI DÙNG (Tài khoản)

**Đường dẫn:** Danh mục → **Tài khoản**

### 4.4.1. Xem danh sách người dùng

| Cột | Ý nghĩa |
|-----|---------|
| Username | Tên đăng nhập |
| Họ tên | Họ tên đầy đủ |
| Vai trò | ADMIN, STORE, SALES... |
| Cửa hàng | Cửa hàng được gán (với STORE) |
| Trạng thái | Hoạt động / Khóa |

### 4.4.2. Tạo tài khoản mới

| Bước | Thao tác |
|------|----------|
| 1 | Nhấn **"+ Thêm người dùng"** |
| 2 | Nhập **Tên đăng nhập** |
| 3 | Nhập **Mật khẩu** |
| 4 | Nhập **Họ tên** |
| 5 | Chọn **Vai trò** (Role) |
| 6 | Chọn **Cửa hàng** (nếu role = STORE) |
| 7 | Nhấn **"Lưu"** |

### 4.4.3. Chỉnh sửa / Khóa tài khoản

- **Sửa:** Nhấn icon ✏️ để chỉnh sửa thông tin
- **Khóa:** Chuyển trạng thái sang "Khóa" để vô hiệu hóa tài khoản

---

## 4.5. QUẢN LÝ SẢN PHẨM (Mặt hàng)

**Đường dẫn:** Danh mục → **Mặt hàng**

### 4.5.1. Danh sách mặt hàng

| Cột | Ý nghĩa |
|-----|---------|
| Mã | VD: RON95, DO_005S |
| Tên | Tên đầy đủ sản phẩm |
| Đơn vị | Lít |
| Trạng thái | Kinh doanh / Ngừng |

### 4.5.2. Thêm mặt hàng mới

| Bước | Thao tác |
|------|----------|
| 1 | Nhấn **"+ Thêm mặt hàng"** |
| 2 | Nhập **Mã mặt hàng** |
| 3 | Nhập **Tên mặt hàng** |
| 4 | Chọn **Đơn vị** |
| 5 | Nhấn **"Lưu"** |

---

## 4.6. QUẢN LÝ GIÁ BÁN

**Đường dẫn:** Danh mục → **Quản lý giá**

### 4.6.1. Giao diện quản lý giá

```
┌─────────────────────────────────────────────────────────────┐
│ [Chọn khu vực ▼]                                            │
├─────────────────────────────────────────────────────────────┤
│ Mặt hàng         │ Giá hiện tại     │ Thao tác             │
│──────────────────┼──────────────────┼──────────────────────│
│ RON 95-III       │ 24,800 đ/lít     │ [Cập nhật giá]       │
│ RON 95-V         │ 24,300 đ/lít     │ [Cập nhật giá]       │
│ DO 0.05S         │ 21,500 đ/lít     │ [Cập nhật giá]       │
└─────────────────────────────────────────────────────────────┘
```

### 4.6.2. Cập nhật giá

| Bước | Thao tác |
|------|----------|
| 1 | Chọn **Khu vực** cần cập nhật giá |
| 2 | Nhấn **"Cập nhật giá"** ở mặt hàng cần sửa |
| 3 | Nhập **Giá mới** |
| 4 | Chọn **Ngày áp dụng** |
| 5 | Nhấn **"Lưu"** |

> ⚠️ **Lưu ý:** Giá mới sẽ áp dụng cho TẤT CẢ cửa hàng trong khu vực đó

---

## 4.7. QUẢN LÝ KHÁCH HÀNG

**Đường dẫn:** Danh mục → **Khách hàng**

### 4.7.1. Danh sách khách hàng

| Cột | Ý nghĩa |
|-----|---------|
| Mã KH | Mã khách hàng |
| Tên | Tên khách hàng/Công ty |
| SĐT | Số điện thoại |
| Địa chỉ | Địa chỉ |
| Hạn mức nợ | Hạn mức tín dụng |
| Dư nợ | Số tiền đang nợ |
| Loại | Cá nhân / Công ty |

### 4.7.2. Thêm khách hàng mới

| Bước | Thao tác |
|------|----------|
| 1 | Nhấn **"+ Thêm khách hàng"** |
| 2 | Nhập **Mã khách hàng** |
| 3 | Nhập **Tên khách hàng** |
| 4 | Chọn **Loại** (Cá nhân/Công ty) |
| 5 | Nhập **SĐT, Địa chỉ** |
| 6 | Nhập **Hạn mức công nợ** |
| 7 | Chọn **Cửa hàng** được phép mua chịu |
| 8 | Nhấn **"Lưu"** |

---

## 4.8. QUẢN LÝ BỒN BỂ

**Đường dẫn:** Cài đặt → **Bồn bể**

### 4.8.1. Thêm bồn mới

| Bước | Thao tác |
|------|----------|
| 1 | Nhấn **"+ Thêm bồn"** |
| 2 | Chọn **Cửa hàng** |
| 3 | Nhập **Tên bồn** |
| 4 | Chọn **Mặt hàng** chứa trong bồn |
| 5 | Nhập **Dung tích** (lít) |
| 6 | Nhấn **"Lưu"** |

---

## 4.9. QUẢN LÝ VÒI BƠM

**Đường dẫn:** Cài đặt → **Vòi bơm**

### 4.9.1. Thêm vòi bơm mới

| Bước | Thao tác |
|------|----------|
| 1 | Nhấn **"+ Thêm vòi bơm"** |
| 2 | Chọn **Cửa hàng** |
| 3 | Nhập **Tên vòi bơm** |
| 4 | Chọn **Bồn kết nối** |
| 5 | Nhấn **"Lưu"** |

---

## 4.10. CÀI ĐẶT HỆ THỐNG

### 4.10.1. Hệ số hao hụt

**Đường dẫn:** Cài đặt → **Hệ số hao hụt**

Thiết lập tỷ lệ hao hụt cho phép khi so sánh tồn sổ và tồn thực tế.

### 4.10.2. Nhập tồn đầu

**Đường dẫn:** Cài đặt → **Nhập tồn đầu**

Thiết lập số lượng tồn kho ban đầu cho từng bồn khi bắt đầu sử dụng hệ thống.

### 4.10.3. Số dư đầu sổ quỹ

**Đường dẫn:** Cài đặt → **Số dư đầu sổ quỹ**

Thiết lập số dư quỹ tiền mặt ban đầu cho từng cửa hàng.

### 4.10.4. Số dư đầu công nợ

**Đường dẫn:** Cài đặt → **Số dư đầu công nợ**

Thiết lập số dư nợ ban đầu cho khách hàng (trước khi dùng hệ thống).

---

## 4.11. QUẢN LÝ CA (Cho Admin)

### 4.11.1. Xem tất cả ca

Admin có thể xem ca của **TẤT CẢ** cửa hàng.

### 4.11.2. Mở lại ca đã khóa

Khi nhân viên cần sửa ca đã chốt:

| Bước | Thao tác |
|------|----------|
| 1 | Tìm ca cần mở lại |
| 2 | Nhấn **"Mở chế độ sửa"** |
| 3 | Nhân viên vào sửa dữ liệu |
| 4 | Sau khi sửa xong, **khóa lại ca** |

> ⚠️ Chỉ mở ca khi thực sự cần thiết, ghi log lý do

---

## 4.12. BÁO CÁO TỔNG HỢP

### 4.12.1. Báo cáo ca

- Xem chi tiết ca của tất cả cửa hàng
- Lọc theo cửa hàng, khoảng thời gian
- Xuất Excel

### 4.12.2. Sổ quỹ

- Xem biến động quỹ tiền mặt
- Thu, chi, nộp tiền
- Số dư cuối kỳ

### 4.12.3. Báo cáo công nợ

- Tổng hợp công nợ theo khách hàng
- Công nợ theo cửa hàng
- Lịch sử phát sinh

### 4.12.4. Doanh thu/Xuất hàng

- Doanh thu theo sản phẩm
- Doanh thu theo cửa hàng
- Xu hướng bán hàng

### 4.12.5. Nhập Xuất Tồn

- Tồn kho từng bồn
- Lịch sử nhập xuất
- Đối chiếu sổ sách

### 4.12.6. Chốt Tồn Kho

Thực hiện chốt tồn kho định kỳ (tháng/quý).

---

# 5. CÁC LƯU Ý QUAN TRỌNG

## 5.1. Quy tắc bảo mật

| # | Quy tắc |
|---|---------|
| 1 | ❌ **KHÔNG** chia sẻ tài khoản với người khác |
| 2 | ❌ **KHÔNG** để đăng nhập khi rời máy |
| 3 | ✅ Đổi mật khẩu định kỳ |
| 4 | ✅ Báo cáo ngay nếu nghi ngờ bị lộ mật khẩu |

## 5.2. Quy tắc nhập liệu

| # | Quy tắc |
|---|---------|
| 1 | ✅ Nhập dữ liệu **CHÍNH XÁC** |
| 2 | ✅ Kiểm tra kỹ trước khi lưu/chốt |
| 3 | ❌ **KHÔNG** tự ý sửa số liệu cũ |
| 4 | ✅ Ghi chú đầy đủ khi cần |

## 5.3. Xử lý sự cố

| Sự cố | Cách xử lý |
|-------|-----------|
| Quên mật khẩu | Liên hệ Admin để reset |
| Sai số liệu ca đã chốt | Liên hệ Admin để mở lại ca |
| Lỗi hệ thống | Chụp màn hình, báo Admin |
| Không đăng nhập được | Kiểm tra mạng, liên hệ Admin |

---

# 6. CÂU HỎI THƯỜNG GẶP (FAQ)

## Q1: Làm sao để sửa số liệu ca đã chốt?
**A:** Liên hệ Admin để yêu cầu "Mở chế độ sửa" cho ca đó.

## Q2: Tại sao không thấy khách hàng trong danh sách công nợ?
**A:** Khách hàng chưa được gán cho cửa hàng của bạn hoặc chưa được tạo. Liên hệ Admin.

## Q3: Số cuối ca sai, làm sao sửa?
**A:**
- Nếu **chưa chốt ca**: Sửa trực tiếp trong tab "Cột bơm"
- Nếu **đã chốt ca**: Liên hệ Admin

## Q4: Làm sao xem dư nợ của khách hàng?
**A:** Vào Báo cáo → Báo cáo công nợ → Chọn khách hàng cần xem

## Q5: Quên ghi công nợ, làm sao bổ sung?
**A:**
- Nếu **ca chưa chốt**: Vào tab "Công nợ" thêm giao dịch
- Nếu **ca đã chốt**: Liên hệ Admin mở lại ca

## Q6: Làm sao biết số dư quỹ tiền mặt?
**A:** Vào Báo cáo → Sổ quỹ để xem số dư hiện tại

## Q7: Admin quên mật khẩu?
**A:** Liên hệ Super Admin hoặc bộ phận kỹ thuật để reset

---

# 📞 LIÊN HỆ HỖ TRỢ

| Vấn đề | Liên hệ |
|--------|---------|
| Lỗi kỹ thuật | Admin hệ thống |
| Vấn đề nghiệp vụ | Phòng Kinh doanh |
| Câu hỏi về tài chính | Phòng Kế toán |
| Cấp/Reset tài khoản | Admin |

---

*📅 Cập nhật lần cuối: 28/01/2026*

*Tài liệu này là tài sản của công ty. Vui lòng không sao chép, phân phối khi chưa được phép.*
