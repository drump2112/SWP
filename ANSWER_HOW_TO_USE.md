# ✅ TRẢ LỜI CÂU HỎI: Cách Sử Dụng Hệ Thống Nhập Xuất Tồn Mới

## 🎯 Câu Hỏi Của Bạn

> **1. Bây giờ sử dụng chức năng này như thế nào?**
> **2. Báo cáo ra làm sao?**
> **3. Nhập tồn đầu cho mỗi cửa hàng để quản lý thì thế nào?**

---

## 📝 TRƯỜNG HỢP 1: NHẬP TỒN ĐẦU CHO MỖI CỬA HÀNG

### Khi Nào Dùng?
- **Setup lần đầu** khi cửa hàng mới vào hệ thống
- **Đầu kỳ kế toán** (đầu tháng, quý, năm)
- **Sau kiểm kê** cần điều chỉnh tồn

### API Sử Dụng
```http
POST /inventory/initial-stock
```

### Ví Dụ: Cửa Hàng Tân Bình (ID=1)

Cửa hàng có 3 bể:
- Bồn 1 (ID=1): Xăng RON 95 - Hiện có 5000 lít
- Bồn 2 (ID=2): Dầu DO - Hiện có 10000 lít
- Bồn 3 (ID=3): Xăng E5 - Hiện có 3000 lít

```bash
curl -X POST http://localhost:3000/inventory/initial-stock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "storeId": 1,
    "effectiveDate": "2026-01-06",
    "notes": "Tồn đầu tháng 01/2026 - Cửa hàng Tân Bình",
    "items": [
      {
        "tankId": 1,
        "productId": 1,
        "quantity": 5000,
        "notes": "Bồn 1 - Xăng 95"
      },
      {
        "tankId": 2,
        "productId": 2,
        "quantity": 10000,
        "notes": "Bồn 2 - Dầu DO"
      },
      {
        "tankId": 3,
        "productId": 3,
        "quantity": 3000,
        "notes": "Bồn 3 - Xăng E5"
      }
    ]
  }'
```

### Kết Quả
✅ Hệ thống tự động:
1. Tính chênh lệch so với tồn hiện tại
2. Ghi vào `inventory_ledger` (quantityIn hoặc quantityOut)
3. Tồn kho = SUM(quantityIn - quantityOut)

---

## 📊 TRƯỜNG HỢP 2: XEM BÁO CÁO TỒN KHO

### Báo Cáo 1: Tồn Kho Hiện Tại Theo Bể

**API:**
```http
GET /inventory/stock-report/:storeId
```

**Ví dụ:**
```bash
# Xem tồn kho cửa hàng Tân Bình (ID=1)
curl http://localhost:3000/inventory/stock-report/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
[
  {
    "tankId": 1,
    "tankCode": "T001",
    "tankName": "Bồn 1",
    "productId": 1,
    "productCode": "XD95",
    "productName": "Xăng RON 95",
    "capacity": 10000,
    "currentStock": 5000,
    "fillPercentage": 50
  },
  {
    "tankId": 2,
    "tankCode": "T002",
    "tankName": "Bồn 2",
    "productId": 2,
    "productCode": "DO",
    "productName": "Dầu Diesel",
    "capacity": 15000,
    "currentStock": 10000,
    "fillPercentage": 66.67
  }
]
```

**Cách Đọc:**
- `currentStock`: Tồn kho THỰC TẾ tính từ ledger
- `fillPercentage`: % đầy của bể

---

### Báo Cáo 2: Nhập Xuất Tồn Theo Kỳ

**API:**
```http
GET /inventory/report/:warehouseId?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
```

**Ví dụ:**
```bash
# Báo cáo tháng 01/2026 của kho ID=1
curl 'http://localhost:3000/inventory/report/1?fromDate=2026-01-01&toDate=2026-01-31' \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
[
  {
    "productId": 1,
    "productCode": "XD95",
    "productName": "Xăng RON 95",
    "unitName": "Lít",
    "openingBalance": 5000,
    "importQuantity": 8000,
    "exportQuantity": 2500,
    "closingBalance": 10500
  }
]
```

**Cách Đọc:**
- `openingBalance`: Tồn đầu kỳ
- `importQuantity`: Tổng nhập trong kỳ
- `exportQuantity`: Tổng xuất trong kỳ
- `closingBalance`: Tồn cuối kỳ
- **Công thức:** `Tồn cuối = Tồn đầu + Nhập - Xuất`

---

### Báo Cáo 3: Chi Tiết Phiếu Nhập Kho

**API:**
```http
GET /reports/inventory-import?storeId=1&fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
```

**Ví dụ:**
```bash
curl 'http://localhost:3000/reports/inventory-import?storeId=1&fromDate=2026-01-01&toDate=2026-01-31' \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
[
  {
    "id": 1,
    "docDate": "2026-01-15",
    "docType": "IMPORT",
    "supplierName": "Công ty Xăng Dầu ABC",
    "invoiceNumber": "HD-2026-001",
    "licensePlate": "29A-12345",
    "warehouse": {
      "storeName": "Cửa hàng Tân Bình"
    },
    "items": [
      {
        "productCode": "XD95",
        "productName": "Xăng RON 95",
        "quantity": 5000,
        "unitPrice": 21000,
        "amount": 105000000,
        "tankCode": "T001"
      }
    ],
    "totalQuantity": 5000,
    "totalAmount": 105000000
  }
]
```

---

### Báo Cáo 4: Tất Cả Bể Của Cửa Hàng

**API:**
```http
GET /tanks?storeId=1
```

**Response:** Giống như stock-report nhưng có thêm thông tin pumps

---

## 🔄 TRƯỜNG HỢP 3: HOẠT ĐỘNG HÀNG NGÀY

### Workflow Chuẩn

```
📅 ĐẦU NGÀY
├─ Nhân viên mở ca: POST /shifts
│
📦 KHI CÓ XE GIAO HÀNG
├─ Nhập phiếu: POST /inventory/documents
├─ Tồn kho TỰ ĐỘNG TĂNG
│
💰 KHÁCH HÀNG MUA
├─ Số bơm tăng (không làm gì cả)
│
🌙 CUỐI CA
├─ Nhân viên đóng ca: POST /shifts/:id/close
├─ Hệ thống ghi ledger: quantityOut = số lít bán
├─ Tồn kho TỰ ĐỘNG GIẢM
│
📊 XEM BÁO CÁO
└─ GET /inventory/stock-report/:storeId
```

### Ví Dụ Chi Tiết

#### Sáng: Nhập Hàng
```bash
POST /inventory/documents
{
  "storeId": 1,
  "docType": "IMPORT",
  "items": [
    {"tankId": 1, "productId": 1, "quantity": 5000, "unitPrice": 21000}
  ]
}
```
**Kết quả:** Bồn 1 tăng 5000 lít

#### Chiều: Đóng Ca (Bán Hàng)
```bash
POST /shifts/1/close
{
  "pumpReadings": [
    {"pumpCode": "P001", "productId": 1, "startValue": 0, "endValue": 500}
  ]
}
```
**Kết quả:** Bồn 1 giảm 500 lít (500 - 0)

---

## 🔍 TRƯỜNG HỢP 4: KIỂM KÊ & ĐIỀU CHỈNH

### Quy Trình

**Bước 1:** Đo thực tế
```
Nhân viên đo chiều cao bể → tra bảng → 4750 lít
```

**Bước 2:** Xem hệ thống
```bash
GET /inventory/stock-report/1
# Response: currentStock = 4800 lít
```

**Bước 3:** So sánh
```
Hệ thống: 4800 lít
Thực tế:  4750 lít
Chênh lệch: -50 lít (thiếu)
```

**Bước 4:** Điều chỉnh
```bash
POST /inventory/initial-stock
{
  "storeId": 1,
  "effectiveDate": "2026-01-06",
  "notes": "Kiểm kê định kỳ - phát hiện thiếu 50 lít",
  "items": [
    {"tankId": 1, "productId": 1, "quantity": 4750}
  ]
}
```

**Kết quả:**
- Hệ thống ghi: `quantityOut = 50` (thiếu hụt)
- Tồn mới: 4750 lít

---

## 📋 CHECKLIST QUẢN LÝ

### Hàng Ngày
- [ ] Nhập hàng khi có xe giao
- [ ] Đóng ca cuối ngày
- [ ] Xem báo cáo tồn kho

### Hàng Tuần
- [ ] Xem báo cáo nhập xuất
- [ ] Kiểm tra phiếu nhập kho

### Hàng Tháng
- [ ] Kiểm kê tồn kho
- [ ] Đối chiếu với kế toán
- [ ] In báo cáo tổng hợp

---

## 🎓 TÀI LIỆU HỌC

Đọc theo thứ tự:

1. **[QUICK_START_INVENTORY.md](QUICK_START_INVENTORY.md)** ← BẮT ĐẦU ĐÂY
   - API cơ bản
   - Ví dụ đơn giản
   - Tips & Tricks

2. **[USER_GUIDE_INVENTORY.md](USER_GUIDE_INVENTORY.md)**
   - Hướng dẫn chi tiết
   - Tất cả trường hợp sử dụng
   - Troubleshooting

3. **[demo-inventory.sh](demo-inventory.sh)**
   - Script demo tự động
   - Test toàn bộ flow
   - Chạy: `./demo-inventory.sh`

---

## ⚡ TÓM TẮT NHANH

### 3 API Chính

| API | Mục Đích | Khi Nào Dùng |
|-----|----------|--------------|
| `POST /inventory/initial-stock` | Nhập tồn đầu | Setup, kiểm kê, điều chỉnh |
| `POST /inventory/documents` | Nhập hàng | Khi có xe giao |
| `POST /shifts/:id/close` | Bán hàng | Cuối ca |

### 4 API Xem Báo Cáo

| API | Báo Cáo |
|-----|---------|
| `GET /inventory/stock-report/:storeId` | Tồn hiện tại theo bể |
| `GET /inventory/report/:warehouseId?fromDate&toDate` | Nhập xuất tồn theo kỳ |
| `GET /reports/inventory-import?...` | Chi tiết phiếu nhập |
| `GET /tanks?storeId=1` | Danh sách bể + tồn |

---

## 🎉 KẾT LUẬN

**Hệ thống mới:**
- ✅ Tồn kho luôn chính xác
- ✅ Truy vết đầy đủ mọi giao dịch
- ✅ Báo cáo chi tiết
- ✅ Không cần sửa Frontend (API response giống cũ)

**Cách sử dụng:**
1. Nhập tồn đầu → `POST /inventory/initial-stock`
2. Nhập hàng → `POST /inventory/documents`
3. Bán hàng → `POST /shifts/:id/close`
4. Xem báo cáo → `GET /inventory/stock-report/:storeId`

**Công thức:**
```
Tồn Kho = SUM(quantityIn - quantityOut) từ inventory_ledger
```

---

**Có câu hỏi?** Xem [USER_GUIDE_INVENTORY.md](USER_GUIDE_INVENTORY.md)
**Cần demo?** Chạy `./demo-inventory.sh`
**Cần deploy?** Đọc [DEPLOYMENT_GUIDE_INVENTORY.md](DEPLOYMENT_GUIDE_INVENTORY.md)

---

**Version:** 2.0.0
**Updated:** 2026-01-06
**Author:** Development Team
