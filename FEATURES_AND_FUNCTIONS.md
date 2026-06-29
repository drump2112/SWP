# Phần Mềm Quản Lí Cửa Hàng Xăng Dầu - Danh Sách Chức Năng Toàn Diện

## Tổng Quát

Phần mềm quản lý hoàn chỉnh dành cho cửa hàng xăng dầu, hỗ trợ quản lý ca làm việc, báo cáo hàng hóa, sổ quỹ, bán hàng, quản lý khách hàng, và phân tích dữ liệu.

---

## 1. 🔐 Xác Thực & Quản Lý Quyền Hạn

### Hệ Thống Đăng Nhập

- **Đăng nhập**: Xác thực email/mật khẩu với JWT token
- **Làm mới token**: Cập nhật token hết hạn
- **Đăng xuất**: Xóa phiên làm việc
- **Bảo mật**: Lưu token trong HttpOnly cookies

### Kiểm Soát Quyền Truy Cập (RBAC)

- **6 vai trò**: SUPER_ADMIN, ADMIN, DIRECTOR, SALES, ACCOUNTING, STORE
- **Phân quyền theo vai trò**: Từng endpoint được bảo vệ theo quyền hạn
- **Tính năng bảo mật**: Rate limiting (10 yêu cầu/phút), mã hóa mật khẩu

---

## 2. 👥 Quản Lý Người Dùng & Vai Trò

### Quản Lý Người Dùng

- Tạo, xem, cập nhật, xóa tài khoản người dùng
- Gán người dùng vào cửa hàng cụ thể
- Gán vai trò cho người dùng
- Kích hoạt/vô hiệu hóa tài khoản
- Quản lý tên đầy đủ, tên đăng nhập
- Danh sách người dùng theo cửa hàng

### Quản Lý Vai Trò

- Tạo và quản lý vai trò tùy chỉnh
- Gán quyền cho từng vai trò
- Theo dõi cấp bậc vai trò
- Quản lý mối quan hệ vai trò - quyền hạn

---

## 3. 🏢 Cấu Trúc Tổ Chức

### Quản Lý Khu Vực (Regions)

- Tổ chức địa lý các cửa hàng
- Tạo, cập nhật, xóa khu vực
- Lọc và liệt kê khu vực
- Quản lý cấu trúc cấp bậc khu vực

### Quản Lý Cửa Hàng (Stores)

- Hỗ trợ nhiều chi nhánh xăng dầu
- Lưu trữ thông tin cửa hàng (tên, địa chỉ, vị trí)
- Gán người dùng vào cửa hàng
- Quản lý trạng thái hoạt động
- Quản lý bể chứa và máy bơm theo cửa hàng

---

## 4. 🛢️ Quản Lý Sản Phẩm & Giá Cả

### Quản Lý Sản Phẩm

- Tạo và quản lý các loại nhiên liệu (Xăng, Dầu diesel, v.v.)
- Xem chi tiết sản phẩm
- Phân loại sản phẩm
- Liệt kê toàn bộ sản phẩm

### Hệ Thống Giá Động

- Đặt giá cho sản phẩm theo khu vực
- Giá có thời hạn hiệu lực (validFrom, validTo)
- Đặt giá theo khu vực cho nhiều sản phẩm
- Cập nhật giá sản phẩm
- Theo dõi lịch sử giá
- Xem tất cả các kỳ giá

---

## 5. ⛽ Hạ Tầng Cửa Hàng

### Quản Lý Bể Chứa (Tanks)

- Xác định bể chứa nhiên liệu cho từng cửa hàng
- Theo dõi dung tích bể chứa
- Quản lý trạng thái bể chứa
- Tạo, cập nhật, xóa bể chứa
- Gán bể chứa vào cửa hàng

### Quản Lý Máy Bơm (Pumps)

- Định nghĩa máy bơm nhiên liệu (Máy 1, Máy 2, v.v.)
- Theo dõi chỉ số máy bơm
- Quản lý trạng thái máy bơm (hoạt động/vô hiệu)
- Tạo, cập nhật, xóa máy bơm
- Gán máy bơm vào bể chứa
- Gán máy bơm vào sản phẩm
- Ghi nhận chỉ số máy bơm hàng ngày

---

## 6. 🔄 Quản Lý Ca Làm Việc

### Thao Tác Ca Làm Việc

- Tạo ca (ngày, số ca, cửa hàng)
- Mở và đóng ca
- 3 trạng thái ca: MỞ, ĐÓNG, ĐIỀU CHỈNH
- Phiên bản ca để điều chỉnh
- Mở lại ca đã đóng (cần phê duyệt)
- Khóa/mở khóa ca

### Chi Tiết Ca Làm Việc

- Theo dõi thời gian mở/đóng
- Thông tin bàn giao (tên người bàn giao, tên người nhận)
- Theo dõi hàng tồn kho ban đầu (JSON cho từng sản phẩm)
- Ngày ca và số ca (1, 2, hoặc 3)

### Thao Tác Trong Ca

- Tạo bán hàng nợ trong ca
- Ghi nhận tiền gửi
- Tạo hóa đơn (giao dịch POS)
- Tạo điểm kiểm tra (kiểm kho giữa ca)

### Báo Cáo Ca Làm Việc

- Báo cáo chi tiết ca (GET /shifts/report/:id)
- Tóm tắt tài chính theo ca
- Thay đổi hàng tồn kho trong ca
- Giao dịch bán hàng

---

## 7. 📦 Quản Lý Hàng Tồn Kho

### Chứng Từ Hàng Tồn Kho

- Tạo chứng từ chuyển kho
- Nhập hàng từ xe tải/nhà cung cấp
- Theo dõi khoang xe tải
- Loại chứng từ: Nhập, Xuất, Chuyển, Điều chỉnh
- Theo dõi trạng thái chứng từ

### Thiết Lập Hàng Tồn Kho Ban Đầu

- Đặt hàng tồn kho ban đầu theo bể chứa và sản phẩm
- Nhập hàng tồn kho ban đầu đơn giản
- Quản lý và cập nhật bản ghi hàng tồn kho ban đầu
- Theo dõi điểm bắt đầu hàng tồn kho

### Kiểm Kho

- Tạo bản ghi kiểm kho
- So sánh hàng tồn kho thực vs. hệ thống
- Xác định sai lệch
- Theo dõi điểm kiểm tra giữa ca

### Đóng Hàng Tồn Kho

- Đóng hàng tồn kho cuối kỳ
- Tính toán hàng tồn kho cuối cùng
- Ghi chép sổ hàng tồn kho
- Theo dõi ngày đóng

### Báo Cáo Hàng Tồn Kho

- Báo cáo số dư theo kho
- Báo cáo hàng tồn kho theo cửa hàng
- Báo cáo hàng tồn kho hiện tại
- Báo cáo theo khoảng thời gian
- Định giá dựa trên giá
- Theo dõi dòng chảy và chuyển động hàng

### Tính Toán Hàng Tồn Kho

- Dịch vụ tính toán dầu mỏ (xử lý biến đổi mật độ)
- Máy tính hàng tồn kho
- Công thức: Hàng ban đầu + Nhập - Bán - Mất = Hàng cuối
- Chức năng xuất hàng (Excel, CSV)

### Tính Toán Hàng Mất

- Tính toán hàng mất/sai lệch tự động
- Ghi nhận và theo dõi hàng mất
- Điều chỉnh nhiệt độ và áp suất cho dầu mỏ

---

## 8. 🧾 Quản Lý Bán Hàng & Hóa Đơn

### Quản Lý Hóa Đơn

- Tạo hóa đơn cho giao dịch bán
- Chi tiết hóa đơn (mặt hàng, số lượng, giá)
- Tính tổng hóa đơn
- Trạng thái hóa đơn (CHỜ XỬ LÝ, HOÀN THÀNH, HỦY)
- Theo dõi ngày giờ hóa đơn

### Giao Dịch Bán Hàng

- Ghi nhận bán hàng từ từng máy bơm/sản phẩm
- Doanh số bán theo ca cho từng sản phẩm
- Liên kết khách hàng với bán hàng
- Theo dõi giá bán
- Ghi nhận phương thức thanh toán

### Bán Hàng Nợ

- Tạo bán hàng nợ cho khách hàng bán buôn
- Theo dõi ai nợ bao nhiêu
- Liên kết đến sổ nợ khách hàng
- Theo dõi thanh toán nợ

---

## 9. 💼 Quản Lý Khách Hàng

### Đăng Ký Khách Hàng

- Tạo khách hàng (bán lẻ và bán buôn)
- Thông tin khách hàng (tên, điện thoại, địa chỉ)
- Chi tiết liên hệ khách hàng
- Trạng thái kích hoạt

### Hệ Thống Tín Dụng Khách Hàng

- Đặt hạn mức tín dụng theo cửa hàng cho từng khách hàng
- Theo dõi sử dụng tín dụng theo cửa hàng
- Tính năng vượt hạn mức tín dụng cho khách hàng đặc biệt
- Cập nhật hạn mức tín dụng

### Số Dư Nợ Ban Đầu

- Nhập số dư nợ ban đầu của khách hàng
- Quản lý số dư khách hàng ban đầu
- Cập nhật bản ghi số dư ban đầu
- Xóa bản ghi số dư ban đầu
- Theo dõi ngày số dư ban đầu

### Nhập Dữ Liệu Khách Hàng

- Nhập hàng loạt khách hàng từ tệp
- Nhập số dư ban đầu hàng loạt
- Nhập thông tin nợ ban đầu

### Truy Vấn Khách Hàng

- Tìm tất cả khách hàng
- Tìm khách hàng theo ID
- Tìm khách hàng theo cửa hàng
- Xem thông tin tín dụng khách hàng

---

## 10. 💰 Quản Lý Tiền Mặt

### Sổ Cái Tiền Mặt

- Theo dõi tất cả giao dịch tiền
- Xem số dư tiền theo cửa hàng
- Xem lịch sử toàn bộ sổ cái tiền
- Theo dõi tiền vào/ra

### Gửi Tiền

- Ghi nhận gửi tiền vào ngân hàng
- Số tiền gửi và ngày gửi
- Liên kết gửi tiền với ca
- Theo dõi trạng thái gửi tiền

### Số Dư Tiền Mặt Ban Đầu

- Đặt số dư tiền ban đầu theo cửa hàng theo ngày
- Quản lý bản ghi số dư ban đầu
- Cập nhật số dư ban đầu
- Xóa bản ghi số dư ban đầu
- Nhập số dư tiền ban đầu hàng loạt

---

## 11. 💳 Quản Lý Nợ

### Sổ Cái Nợ

- Theo dõi nợ khách hàng theo cửa hàng
- Số dư nợ cho từng khách hàng theo cửa hàng
- Lịch sử giao dịch nợ
- Số tiền còn nợ

### Báo Cáo Nợ

- Báo cáo nợ theo cửa hàng
- Báo cáo nợ theo khách hàng
- Lọc theo khoảng thời gian
- Phân tích nợ quá hạn

---

## 12. 📊 Quản Lý Chi Phí

### Theo Dõi Chi Phí

- Tạo bản ghi chi phí
- Danh mục chi phí
- Theo dõi số tiền chi phí
- Ngày giờ chi phí
- Cửa hàng liên quan

### Danh Mục Chi Phí

- Danh mục chi phí được xác định trước
- Tạo danh mục tùy chỉnh
- Phân loại chi phí
- Theo dõi chi phí theo danh mục

---

## 13. ⚙️ Cấu Hình Hàng Mất

### Cấu Hình Hàng Mất

- Đặt tỉ lệ hàng mất chấp nhận được theo cửa hàng
- Xác định ngưỡng hàng mất
- Cấu hình phương pháp tính toán hàng mất
- Hệ số điều chỉnh nhiệt độ/áp suất cho dầu mỏ

---

## 14. 📈 Báo Cáo & Phân Tích

### Module Báo Cáo

#### Báo Cáo Nợ (GET /reports/debt)

- Báo cáo nợ toàn diện theo khách hàng/cửa hàng
- Số tiền còn nợ
- Phân tích nợ quá hạn
- Lọc theo khoảng thời gian

#### Báo Cáo Ca (GET /reports/shift)

- Tóm tắt tài chính ca
- Tổng doanh số bán
- Tóm tắt tiền mặt
- Thay đổi hàng tồn kho

#### Báo Cáo Bàn Giao (GET /reports/handover)

- Tóm tắt bàn giao ca
- Số dư mở và đóng
- Thông tin bàn giao

#### Báo Cáo Tiền Mặt

- Tiền vào/ra theo cửa hàng
- Tóm tắt số dư tiền
- Theo dõi gửi tiền
- Đối chiếu tiền mặt

#### Báo Cáo Doanh Thu & Bán Hàng

- Tổng doanh thu theo cửa hàng/ngày
- Doanh thu theo sản phẩm
- Bán hàng theo khách hàng
- Xu hướng doanh số

#### Báo Cáo Hàng Tồn Kho

- Mức hàng tồn kho theo bể/sản phẩm
- Định giá hàng tồn kho
- Tóm tắt nhập/xuất
- Chuyển động hàng

### Module Phân Tích

#### Tổng Quan Dashboard (GET /analytics/overview)

- Tóm tắt các chỉ số chính
- Tổng doanh thu
- Số lượng giao dịch
- Trạng thái nợ khách hàng
- So sánh với kỳ trước

#### Phân Tích Doanh Thu

- Xu hướng doanh thu hàng tháng (GET /analytics/revenue/monthly)
- So sánh doanh thu theo cửa hàng (GET /analytics/revenue/by-store)
- Xu hướng doanh thu cửa hàng theo tháng (GET /analytics/revenue/store-trends)

#### Phân Tích Hàng Tồn Kho

- Giá trị hàng tồn kho tổng
- Hàng tồn kho theo sản phẩm/bể chứa
- Mức hàng kho theo cửa hàng

---

## 15. 🏭 Module Thương Mại/Bán Buôn

### Quản Lý Khách Hàng Thương Mại

- Đăng ký khách hàng bán buôn
- Quản lý nhóm khách hàng
- Thao tác khách hàng hàng loạt
- Theo dõi trạng thái khách hàng

### Quản Lý Kho (Warehouses)

- Nhiều vị trí kho
- Quản lý hàng tồn kho kho
- Theo dõi sức chứa kho
- Tạo, cập nhật, xóa kho

### Quản Lý Nhà Cung Cấp

- Đăng ký nhà cung cấp
- Chi tiết nhà cung cấp (tên, liên hệ, địa chỉ)
- Điều khoản thanh toán nhà cung cấp
- Theo dõi mối quan hệ nhà cung cấp

### Quản Lý Nhóm Khách Hàng

- Nhóm khách hàng cho thao tác hàng loạt
- Quản lý giảm giá nhóm
- Giá cơ bản nhóm

### Quản Lý Lô Nhập

- Theo dõi nhập hàng từ nhà cung cấp
- Theo dõi lô với số lot
- Số lượng và giá đơn vị theo lô
- Trạng thái lô (HOẠT ĐỘNG, BỘ PHẬN, HOÀN THÀNH, HỦY)
- Theo dõi FIFO (Hàng vào trước, hàng ra trước)
- Tính toán hàng còn lại
- Theo dõi giá đơn vị cuối cùng theo lô
- Khả năng truy xuất nhà cung cấp

### Quản Lý Đơn Xuất

- Tạo đơn xuất buôn
- Xuất cho khách hàng bán buôn
- Các dòng đơn hàng (sản phẩm, số lượng, giá)
- Theo dõi trạng thái đơn (CHỜ XỬ LÝ, XÁC NHẬN, ĐÃ GIAO, HỦY)
- Theo dõi trạng thái thanh toán (ĐÃ TRẢ, CHƯA TRẢ, TRẢ PHẦN)
- Ngày đơn hàng và ngày giao hàng
- Tạo báo cáo đơn xuất

### Báo Cáo Thương Mại

- Báo cáo hàng tồn kho theo kho
- Mức hàng tồn kho kho
- Hàng tồn kho theo sản phẩm theo nhà cung cấp
- Theo dõi hết hạn lô
- Tính toán giá trị hàng

---

## 16. 🖥️ Giao Diện Người Dùng - Các Trang

### Trang Cốt Lõi

- **Trang Đăng Nhập** - Điểm vào xác thực
- **Trang Dashboard** - Tổng quan chính với KPIs và biểu đồ

### Trang Quản Lý Ca

- **Trang Quản Lý Ca** - Tạo, xem, quản lý ca
- **Trang Thao Tác Ca** - Ghi nhận bán hàng, gửi tiền, bán nợ
- **Trang Báo Cáo Ca** - Xem báo cáo tài chính chi tiết ca
- **Trang Báo Cáo Bàn Giao** - Xem tóm tắt bàn giao
- **Trang Đóng Ca** - Đóng ca với đối chiếu cuối cùng

### Trang Quản Lý Cửa Hàng

- **Trang Cửa Hàng** - Liệt kê và quản lý cửa hàng
- **Trang Chi Tiết Cửa Hàng** - Thông tin chi tiết cửa hàng có thẻ
- **Trang Bể Chứa** - Quản lý bể chứa theo cửa hàng
- **Trang Máy Bơm** - Quản lý máy bơm theo cửa hàng

### Trang Người Dùng & Quản Trị

- **Trang Người Dùng** - Quản lý tài khoản người dùng

### Trang Sản Phẩm & Giá

- **Trang Sản Phẩm** - Tạo và quản lý nhiên liệu
- **Trang Giá** - Đặt và quản lý giá sản phẩm

### Trang Khách Hàng & Nợ

- **Trang Khách Hàng** - Quản lý khách hàng
- **Trang Tín Dụng Khách Hàng** - Quản lý hạn mức tín dụng
- **Trang Báo Cáo Nợ** - Xem nợ khách hàng và phân tích quá hạn
- **Trang Số Dư Ban Đầu** - Đặt số dư khách hàng ban đầu

### Trang Quản Lý Hàng Tồn Kho

- **Trang Nhập Hàng** - Nhập hàng từ xe tải
- **Trang Báo Cáo Hàng Tồn Kho** - Xem chuyển động hàng
- **Trang Hàng Tồn Kho Ban Đầu** - Đặt hàng tồn kho ban đầu
- **Trang Quản Lý Hàng Tồn Kho Ban Đầu** - Cập nhật bản ghi hàng tồn kho ban đầu
- **Trang Báo Cáo Hàng** - Mức hàng tồn kho hiện tại
- **Trang Kiểm Kho** - Tạo kiểm kho
- **Trang Đóng Hàng Tồn Kho** - Đóng cuối kỳ

### Trang Quản Lý Tiền Mặt

- **Trang Số Dư Tiền Ban Đầu** - Đặt số dư tiền ban đầu
- **Trang Quản Lý Số Dư Tiền Ban Đầu** - Cập nhật số dư
- **Trang Báo Cáo Tiền** - Báo cáo tiền vào/ra

### Trang Báo Cáo

- **Trang Báo Cáo Doanh Thu Bán Hàng** - Phân tích doanh thu và bán hàng
- **Trang Báo Cáo Bán Hàng** - Giao dịch bán hàng chi tiết
- **Trang Báo Cáo Bán Hàng Theo Khách Hàng** - Bán hàng theo khách hàng

### Trang Cấu Hình Hàng Mất

- **Trang Cấu Hình Hàng Mất** - Cấu hình tỉ lệ hàng mất chấp nhận

### Trang Module Thương Mại

- **Trang Nhà Cung Cấp Thương Mại** - Quản lý nhà cung cấp
- **Trang Kho Thương Mại** - Quản lý kho
- **Trang Nhóm Khách Hàng Thương Mại** - Quản lý nhóm khách hàng
- **Trang Khách Hàng Thương Mại** - Đăng ký khách hàng bán buôn
- **Trang Lô Nhập Thương Mại** - Theo dõi lô nhập
- **Trang Đơn Xuất Thương Mại** - Tạo và theo dõi đơn xuất
- **Trang Báo Cáo Hàng Tồn Kho Thương Mại** - Báo cáo hàng tồn kho kho

---

## 17. 🛠️ Các Thành Phần Frontend

### Các Thành Phần UI

- **DashboardLayout** - Wrapper layout chính với sidebar và header
- **Header** - Thanh điều hướng trên cùng với menu người dùng
- **Sidebar** - Menu điều hướng chính
- **Modal/Dialog** - Cửa sổ tương tác
- **Form Components** - Thành phần biểu mẫu tái sử dụng
- **Data Tables** - Bảng dữ liệu có thể sắp xếp/lọc
- **Charts/Graphs** - Biểu đồ trực quan hóa dữ liệu
- **Status Badges** - Hiển thị trạng thái
- **Loading Spinners** - Chỉ báo tải
- **Error Messages** - Hiển thị lỗi người dùng

### Hooks & Utilities

- **Custom Hooks** - useAuth, useFetch, useForm, v.v.
- **API Client** - Lớp gọi API tập trung
- **Utility Functions** - Định dạng, xác thực, chuyển đổi
- **Context Providers** - Quản lý trạng thái toàn cục

---

## 18. 🔗 Tích Hợp & Kết Nối

### Backend-Frontend Integration

- RESTful API endpoints kết nối
- WebSocket cho cập nhật thời gian thực (nếu có)
- Xác thực token JWT
- Xử lý lỗi toàn cục

### Cơ Sở Dữ Liệu

- Database SQL được thiết kế cho các hoạt động phức tạp
- Hỗ trợ giao dịch
- Các chỉ số được tối ưu hóa cho truy vấn báo cáo

### Deployment

- Docker Compose cho quá trình phát triển
- Dockerfile cho cả Backend và Frontend
- Cấu hình nginx cho Frontend
- PostgreSQL database container

---

## 📋 Tóm Tắt Chức Năng Chính

### Chức Năng Quan Trọng Nhất

1. ✅ **Quản Lý Ca Làm Việc** - Tạo, mở, đóng, điều chỉnh ca
2. ✅ **Quản Lý Hàng Tồn Kho** - Theo dõi nhập, xuất, kiểm kho, định giá
3. ✅ **Quản Lý Tiền Mặt** - Sổ cái tiền, gửi tiền, đối chiếu
4. ✅ **Quản Lý Khách Hàng & Nợ** - Tín dụng, nợ, thanh toán
5. ✅ **Báo Cáo & Phân Tích** - Doanh thu, nợ, hàng tồn kho, tổng quan
6. ✅ **Bán Buôn (Thương Mại)** - Nhà cung cấp, kho, lô nhập, đơn xuất
7. ✅ **Quản Lý Sản Phẩm & Giá** - Định nghĩa sản phẩm, giá động theo khu vực
8. ✅ **Bảo Mật & Quyền Truy Cập** - RBAC, xác thực JWT, quản lý người dùng

---

**Phần mềm này là một giải pháp quản lý toàn diện cho các cửa hàng xăng dầu với khả năng theo dõi chi tiết tất cả các hoạt động từ bán lẻ đến bán buôn, quản lý tài chính, hàng tồn kho, và báo cáo phân tích.**
