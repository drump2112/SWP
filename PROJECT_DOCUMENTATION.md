# 📋 TÀI LIỆU DỰ ÁN: HỆ THỐNG QUẢN LÝ XĂNG DẦU
## (Fuel Management System - FMS)

---

## 📌 TỔNG QUAN DỰ ÁN

### 1. Dự án giải quyết vấn đề gì?

Hệ thống Quản lý Xăng Dầu (FMS) được xây dựng để giải quyết các vấn đề trong quản lý chuỗi cửa hàng xăng dầu:

#### 🔴 **Các vấn đề trước khi có phần mềm:**

| Vấn đề | Mô tả | Hậu quả |
|--------|-------|---------|
| **Quản lý thủ công** | Ghi chép sổ sách bằng tay, báo cáo bằng Excel | Dễ sai sót, mất thời gian, khó truy vết |
| **Thiếu minh bạch** | Không có hệ thống kiểm soát tập trung | Khó phát hiện gian lận, thất thoát |
| **Công nợ rối loạn** | Quản lý công nợ khách hàng không đồng bộ | Nợ xấu, quên thu tiền, tranh chấp |
| **Tồn kho không chính xác** | Không đối chiếu được giữa bán ra và tồn kho | Hao hụt không kiểm soát, mất mát tài sản |
| **Quỹ tiền mặt** | Không theo dõi dòng tiền real-time | Thất thoát tiền, không cân đối được |
| **Báo cáo chậm trễ** | Tổng hợp số liệu từ nhiều cửa hàng thủ công | Quyết định chậm, thông tin cũ |
| **Giá bán không đồng bộ** | Mỗi cửa hàng tự set giá | Giá không thống nhất, mất kiểm soát |

#### 🟢 **Giải pháp của hệ thống:**

1. **Số hóa toàn bộ quy trình** - Từ chốt ca, bán hàng, thu tiền đến báo cáo
2. **Ledger-First Design** - Mọi biến động đều được ghi vào sổ cái, không chỉnh sửa trực tiếp, đảm bảo truy vết 100%
3. **Phân quyền chặt chẽ** - Ai làm gì, ở đâu, được phép gì đều rõ ràng
4. **Báo cáo real-time** - Giám đốc có thể xem số liệu toàn hệ thống ngay lập tức
5. **Kiểm soát tập trung** - Giá bán, công nợ, tồn kho đều được quản lý từ trung tâm

---

## 📊 QUẢN LÝ GÌ VÀ VÌ SAO CẦN QUẢN LÝ?

### 2.1. Quản lý Cửa hàng (Stores)

| Nội dung | Vì sao cần? |
|----------|-------------|
| Thông tin cửa hàng (mã, tên, địa chỉ) | Định danh và theo dõi từng điểm bán |
| Thuộc khu vực nào | Áp dụng giá theo vùng, phân quyền quản lý |
| Nhân viên được gán | Kiểm soát ai có quyền thao tác |

### 2.2. Quản lý Ca làm việc (Shifts)

| Nội dung | Vì sao cần? |
|----------|-------------|
| Mở ca/Đóng ca | Xác định khoảng thời gian chịu trách nhiệm |
| Số liệu cột bơm đầu/cuối ca | Tính toán lượng bán ra chính xác |
| Doanh thu trong ca | Kiểm soát tiền thu được |
| Người chịu trách nhiệm | Quy trách nhiệm khi sai lệch |

### 2.3. Quản lý Công nợ (Debt)

| Nội dung | Vì sao cần? |
|----------|-------------|
| Khách hàng mua chịu | Biết ai nợ bao nhiêu |
| Lịch sử phát sinh nợ | Theo dõi nguồn gốc nợ |
| Lịch sử thanh toán | Biết đã thu được bao nhiêu |
| Số dư công nợ | Đòi nợ đúng số, tránh tranh chấp |

### 2.4. Quản lý Tồn kho (Inventory)

| Nội dung | Vì sao cần? |
|----------|-------------|
| Số lượng nhập vào | Biết nguồn cung |
| Số lượng xuất ra (bán) | Đối chiếu với doanh thu |
| Số tồn thực tế | Phát hiện hao hụt, thất thoát |
| Lịch sử biến động | Truy vết khi có sai lệch |

### 2.5. Quản lý Quỹ tiền mặt (Cash)

| Nội dung | Vì sao cần? |
|----------|-------------|
| Tiền thu vào | Kiểm soát doanh thu thực nhận |
| Tiền chi ra | Kiểm soát chi phí |
| Tiền nộp về công ty | Đảm bảo tiền không tồn đọng |
| Số dư quỹ | Cân đối tài chính |

### 2.6. Quản lý Giá bán (Product Prices)

| Nội dung | Vì sao cần? |
|----------|-------------|
| Giá theo khu vực | Áp dụng giá khác nhau theo vùng miền |
| Giá theo thời gian | Theo dõi lịch sử điều chỉnh giá |
| Áp dụng đồng bộ | Tất cả cửa hàng trong khu vực dùng chung giá |

### 2.7. Quản lý Sản phẩm (Products)

| Nội dung | Vì sao cần? |
|----------|-------------|
| Danh mục xăng dầu | Phân loại sản phẩm bán |
| Đơn vị tính | Tính toán chính xác |
| Trạng thái | Biết sản phẩm nào đang kinh doanh |

### 2.8. Quản lý Người dùng & Phân quyền (Users & Roles)

| Nội dung | Vì sao cần? |
|----------|-------------|
| Tài khoản đăng nhập | Xác thực người dùng |
| Vai trò (Role) | Xác định quyền hạn |
| Cửa hàng được gán | Giới hạn phạm vi thao tác |

---

## 👥 PHÂN QUYỀN HỆ THỐNG

### Các vai trò (Roles):

| Role | Mô tả | Phạm vi |
|------|-------|---------|
| **ADMIN** | Quản trị viên hệ thống | Toàn bộ hệ thống |
| **DIRECTOR** | Giám đốc | Xem tất cả, không thao tác nghiệp vụ |
| **SALES** | Phòng Kinh doanh | Quản lý giá, xem công nợ, tồn kho |
| **ACCOUNTING** | Phòng Kế toán | Xem báo cáo tài chính, công nợ |
| **STORE** | Nhân viên cửa hàng | Chỉ cửa hàng được gán |

### Ma trận phân quyền chi tiết:

| Chức năng | ADMIN | DIRECTOR | SALES | ACCOUNTING | STORE |
|-----------|:-----:|:--------:|:-----:|:----------:|:-----:|
| Quản lý users | ✅ | 👁️ | ❌ | ❌ | ❌ |
| Quản lý cửa hàng | ✅ | 👁️ | ❌ | ❌ | ❌ |
| Quản lý khu vực | ✅ | 👁️ | ❌ | ❌ | ❌ |
| Quản lý sản phẩm | ✅ | 👁️ | ✅ | ❌ | ❌ |
| Điều chỉnh giá | ✅ | ❌ | ✅ | ❌ | ❌ |
| Mở/Chốt ca | ❌ | ❌ | ❌ | ❌ | ✅ |
| Bán hàng công nợ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Lập phiếu thu | ❌ | ❌ | ❌ | ✅ | ✅ |
| Nộp tiền công ty | ❌ | ❌ | ❌ | ❌ | ✅ |
| Nhập/Xuất kho | ✅ | ❌ | ✅ | ❌ | ✅ |
| Xem báo cáo doanh thu | ✅ | ✅ | ✅ | ✅ | 🏪 |
| Xem báo cáo công nợ | ✅ | ✅ | ✅ | ✅ | 🏪 |
| Xem báo cáo tồn kho | ✅ | ✅ | ✅ | ✅ | 🏪 |
| Xem báo cáo quỹ | ✅ | ✅ | ✅ | ✅ | 🏪 |
| Dashboard tổng quan | ✅ | ✅ | ✅ | ✅ | ❌ |

**Chú thích:**
- ✅ = Có quyền đầy đủ
- 👁️ = Chỉ xem
- 🏪 = Chỉ của cửa hàng mình
- ❌ = Không có quyền

---

## 📜 QUY ĐỊNH BẮT BUỘC ĐỐI VỚI NGƯỜI SỬ DỤNG

### 3.1. Quy định chung cho TẤT CẢ người dùng

| STT | Quy định | Mục đích |
|-----|----------|----------|
| 1 | **Bảo mật tài khoản** - Không chia sẻ mật khẩu cho bất kỳ ai | Đảm bảo an ninh, quy trách nhiệm |
| 2 | **Đăng xuất khi rời máy** - Không để phiên đăng nhập mở | Tránh truy cập trái phép |
| 3 | **Thao tác trung thực** - Nhập dữ liệu chính xác, không gian lận | Đảm bảo tính toàn vẹn dữ liệu |
| 4 | **Báo cáo sự cố** - Phát hiện lỗi hệ thống phải báo ngay | Khắc phục kịp thời |
| 5 | **Không tự ý sửa dữ liệu cũ** - Mọi điều chỉnh phải qua quy trình | Giữ audit trail |

### 3.2. Quy định riêng cho vai trò STORE (Nhân viên cửa hàng)

#### 📋 Quy trình bắt buộc:

| STT | Quy trình | Chi tiết | Thời hạn |
|-----|-----------|----------|----------|
| 1 | **Mở ca đầu ngày** | Kiểm tra số cột bơm đầu ca khớp với cuối ca trước | Đầu ca làm việc |
| 2 | **Ghi nhận bán công nợ** | Nhập ngay khi phát sinh, có xác nhận khách hàng | Trong ca |
| 3 | **Lập phiếu thu** | Ghi nhận đầy đủ tiền thu được | Trong ca |
| 4 | **Chốt ca cuối ngày** | Nhập chính xác số cột bơm cuối ca | Cuối ca |
| 5 | **Đối chiếu tiền mặt** | Kiểm đếm tiền thực tế khớp với hệ thống | Cuối ca |
| 6 | **Nộp tiền về công ty** | Nộp đúng số, đúng hạn | Theo quy định |

#### ⚠️ Những điều KHÔNG được làm:

- ❌ Chốt ca khi chưa kiểm tra số liệu cột bơm
- ❌ Bán hàng công nợ cho khách không có trong danh sách được phép
- ❌ Tự ý điều chỉnh giá bán
- ❌ Giữ tiền mặt quá hạn nộp
- ❌ Thao tác trên ca của người khác

### 3.3. Quy định riêng cho vai trò SALES (Phòng Kinh doanh)

| STT | Quy định | Chi tiết |
|-----|----------|----------|
| 1 | **Điều chỉnh giá đúng quy trình** | Phải có phê duyệt trước khi thay đổi giá |
| 2 | **Kiểm tra trước khi áp dụng** | Đảm bảo giá đúng cho đúng khu vực |
| 3 | **Theo dõi công nợ định kỳ** | Báo cáo công nợ quá hạn |
| 4 | **Giám sát tồn kho** | Phát hiện bất thường về hao hụt |

### 3.4. Quy định riêng cho vai trò ACCOUNTING (Phòng Kế toán)

| STT | Quy định | Chi tiết |
|-----|----------|----------|
| 1 | **Đối chiếu số liệu định kỳ** | So khớp giữa hệ thống và thực tế |
| 2 | **Kiểm tra phiếu thu** | Đảm bảo phiếu thu hợp lệ |
| 3 | **Theo dõi nộp tiền** | Đảm bảo cửa hàng nộp đủ, đúng hạn |
| 4 | **Báo cáo bất thường** | Phát hiện sai lệch phải báo cáo ngay |

### 3.5. Quy định riêng cho vai trò ADMIN

| STT | Quy định | Chi tiết |
|-----|----------|----------|
| 1 | **Phân quyền đúng vai trò** | Không cấp quyền thừa cho user |
| 2 | **Bảo mật tài khoản admin** | Mật khẩu mạnh, đổi định kỳ |
| 3 | **Ghi log thay đổi** | Mọi thay đổi cấu hình phải có lý do |
| 4 | **Backup dữ liệu** | Đảm bảo dữ liệu được sao lưu |

---

## 🔄 QUY TRÌNH NGHIỆP VỤ CHÍNH

### 4.1. Quy trình chốt ca

```
┌─────────────────┐
│   MỞ CA         │ ← Ghi nhận số cột bơm đầu ca
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HOẠT ĐỘNG CA   │ ← Bán hàng, thu tiền, ghi công nợ
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   CHỐT CA       │ ← Nhập số cột bơm cuối ca
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HỆ THỐNG TỰ ĐỘNG │
│  • Tính lượng bán  │
│  • Ghi sổ kho      │
│  • Tính doanh thu  │
└─────────────────┘
```

### 4.2. Quy trình bán công nợ

```
┌─────────────────┐
│ CHỌN KHÁCH HÀNG │ ← Phải có trong danh sách
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ NHẬP SẢN PHẨM   │ ← Số lượng, đơn giá
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HỆ THỐNG GHI   │
│  • Ghi sổ công nợ │
│  • Ghi sổ kho     │
└─────────────────┘
```

### 4.3. Quy trình thu tiền

```
┌─────────────────┐
│  LẬP PHIẾU THU  │
└────────┬────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌────────────────┐  ┌────────────────┐
│ Tiền bán hàng  │  │ Thanh toán nợ  │
└────────┬───────┘  └────────┬───────┘
         │                   │
         └────────┬──────────┘
                  ▼
┌─────────────────────────┐
│  HỆ THỐNG GHI           │
│  • Ghi sổ quỹ (cash_in) │
│  • Ghi sổ công nợ       │
│    (credit - giảm nợ)   │
└─────────────────────────┘
```

---

## 🛡️ NGUYÊN TẮC LEDGER-FIRST

Hệ thống áp dụng nguyên tắc **Ledger-First** để đảm bảo tính toàn vẹn dữ liệu:

| Nguyên tắc | Mô tả |
|------------|-------|
| **Không sửa trực tiếp** | Không được UPDATE trực tiếp số dư tồn kho, công nợ, quỹ |
| **Ghi qua sổ cái** | Mọi biến động phải ghi qua các bảng LEDGER |
| **Điều chỉnh = Bút toán mới** | Sai thì tạo bút toán điều chỉnh, không xóa cũ |
| **Audit trail** | Mọi thao tác đều được ghi log, truy vết được |

### Các sổ cái trong hệ thống:

| Sổ cái | Mục đích |
|--------|----------|
| `debt_ledger` | Ghi nhận mọi biến động công nợ |
| `inventory_ledger` | Ghi nhận mọi biến động tồn kho |
| `cash_ledger` | Ghi nhận mọi biến động tiền mặt |
| `audit_logs` | Ghi nhận mọi thao tác của user |

---

## 📞 LIÊN HỆ HỖ TRỢ

Khi gặp sự cố hoặc cần hỗ trợ:

1. **Lỗi kỹ thuật**: Liên hệ Admin hệ thống
2. **Lỗi nghiệp vụ**: Liên hệ Phòng Kinh doanh/Kế toán
3. **Yêu cầu cấp quyền**: Liên hệ Admin

---

## 📅 LỊCH SỬ TÀI LIỆU

| Phiên bản | Ngày | Mô tả |
|-----------|------|-------|
| 1.0 | 19/01/2026 | Tạo tài liệu ban đầu |

---

*Tài liệu này là tài sản của công ty. Cấm sao chép, phân phối khi chưa được phép.*
