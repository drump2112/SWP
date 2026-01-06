# Hướng Dẫn Sử Dụng - Hệ Thống Nhập Xuất Tồn Mới

## 📋 Mục Lục
1. [Nhập Tồn Đầu Kỳ](#1-nhập-tồn-đầu-kỳ)
2. [Nhập Hàng Thường Xuyên](#2-nhập-hàng-thường-xuyên)
3. [Bán Hàng](#3-bán-hàng)
4. [Xem Báo Cáo Tồn Kho](#4-xem-báo-cáo-tồn-kho)
5. [Kiểm Kê & Điều Chỉnh](#5-kiểm-kê--điều-chỉnh)

---

## 1. Nhập Tồn Đầu Kỳ

### 📌 Khi Nào Dùng?
- **Lần đầu** setup hệ thống cho cửa hàng mới
- **Đầu kỳ kế toán** (đầu tháng, đầu quý, đầu năm)
- **Điều chỉnh tồn** sau kiểm kê

### 🔧 API Endpoint
```http
POST /inventory/initial-stock
Content-Type: application/json
Authorization: Bearer {token}
```

### 📝 Request Body
```json
{
  "storeId": 1,
  "effectiveDate": "2026-01-01",
  "notes": "Tồn đầu tháng 1/2026",
  "items": [
    {
      "tankId": 1,
      "productId": 1,
      "quantity": 5000,
      "notes": "Bồn 1 - Xăng RON 95"
    },
    {
      "tankId": 2,
      "productId": 2,
      "quantity": 8000,
      "notes": "Bồn 2 - Dầu DO"
    },
    {
      "tankId": 3,
      "productId": 1,
      "quantity": 3000,
      "notes": "Bồn 3 - Xăng RON 95"
    }
  ]
}
```

### ✅ Response
```json
{
  "document": {
    "id": 123,
    "docType": "ADJUSTMENT",
    "docDate": "2026-01-01T00:00:00.000Z",
    "invoiceNumber": "TON-DAU-1-1736150400000",
    "supplierName": "TỒN ĐẦU KỲ",
    "status": "COMPLETED"
  },
  "message": "Đã nhập tồn đầu kỳ cho 3 bể"
}
```

### 💡 Lưu Ý
- Hệ thống sẽ **tự động tính chênh lệch** so với tồn hiện tại
- Nếu tồn hiện tại = 0, sẽ ghi `quantityIn` = số lượng nhập
- Nếu tồn hiện tại > 0, sẽ điều chỉnh tăng/giảm tương ứng
- **Chỉ ADMIN và ACCOUNTING** được phép nhập tồn đầu

### 📖 Ví Dụ Cụ Thể

#### Tình Huống 1: Cửa hàng mới (chưa có tồn)
```bash
# Cửa hàng Tân Bình (ID=1) mới mở
# Có 3 bể: T001 (RON95), T002 (DO), T003 (RON95)

curl -X POST http://localhost:3000/inventory/initial-stock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "storeId": 1,
    "effectiveDate": "2026-01-06",
    "notes": "Setup ban đầu cửa hàng Tân Bình",
    "items": [
      {
        "tankId": 1,
        "productId": 1,
        "quantity": 5000,
        "notes": "Bồn T001 - Xăng 95 - 5000 lít"
      },
      {
        "tankId": 2,
        "productId": 2,
        "quantity": 10000,
        "notes": "Bồn T002 - Dầu DO - 10000 lít"
      },
      {
        "tankId": 3,
        "productId": 1,
        "quantity": 3000,
        "notes": "Bồn T003 - Xăng 95 - 3000 lít"
      }
    ]
  }'
```

**Kết quả trong inventory_ledger:**
| tank_id | product_id | ref_type | quantity_in | quantity_out |
|---------|------------|----------|-------------|--------------|
| 1 | 1 | ADJUSTMENT | 5000 | 0 |
| 2 | 2 | ADJUSTMENT | 10000 | 0 |
| 3 | 1 | ADJUSTMENT | 3000 | 0 |

#### Tình Huống 2: Điều chỉnh sau kiểm kê
```bash
# Kiểm kê thực tế phát hiện:
# - Bồn 1: Đang có 4800 lít (theo hệ thống), thực tế 4750 lít → thiếu 50 lít
# - Bồn 2: Đang có 9500 lít, thực tế 9520 lít → thừa 20 lít

curl -X POST http://localhost:3000/inventory/initial-stock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "storeId": 1,
    "effectiveDate": "2026-01-06",
    "notes": "Điều chỉnh sau kiểm kê ngày 06/01/2026",
    "items": [
      {
        "tankId": 1,
        "productId": 1,
        "quantity": 4750,
        "notes": "Kiểm kê thực tế: 4750 lít (thiếu 50 lít)"
      },
      {
        "tankId": 2,
        "productId": 2,
        "quantity": 9520,
        "notes": "Kiểm kê thực tế: 9520 lít (thừa 20 lít)"
      }
    ]
  }'
```

**Kết quả trong inventory_ledger:**
| tank_id | product_id | ref_type | quantity_in | quantity_out | Notes |
|---------|------------|----------|-------------|--------------|-------|
| 1 | 1 | ADJUSTMENT | 0 | 50 | Thiếu hụt |
| 2 | 2 | ADJUSTMENT | 20 | 0 | Thừa |

---

## 2. Nhập Hàng Thường Xuyên

### 📌 Khi Nào Dùng?
- Nhập hàng từ nhà cung cấp
- Điều chuyển hàng từ kho khác đến

### 🔧 API Endpoint
```http
POST /inventory/documents
Content-Type: application/json
```

### 📝 Request Body - Nhập Hàng Đơn Giản
```json
{
  "storeId": 1,
  "docType": "IMPORT",
  "docDate": "2026-01-06",
  "supplierName": "Công ty Xăng Dầu ABC",
  "invoiceNumber": "HD-2026-001",
  "licensePlate": "29A-12345",
  "items": [
    {
      "productId": 1,
      "tankId": 1,
      "quantity": 5000,
      "unitPrice": 21000
    },
    {
      "productId": 2,
      "tankId": 2,
      "quantity": 8000,
      "unitPrice": 19500
    }
  ]
}
```

### 📝 Request Body - Nhập Hàng Với Xe Téc (Có Tính Hao Hụt)
```http
POST /inventory/documents/with-truck
```

```json
{
  "storeId": 1,
  "docType": "IMPORT",
  "docDate": "2026-01-06",
  "supplierName": "Công ty Xăng Dầu ABC",
  "invoiceNumber": "HD-2026-001",
  "licensePlate": "29A-12345",
  "notes": "Nhập hàng từ xe téc",
  "compartments": [
    {
      "compartmentNumber": 1,
      "productId": 1,
      "compartmentHeight": 120,
      "truckTemperature": 32,
      "truckVolume": 5000,
      "warehouseHeight": 118,
      "actualTemperature": 28,
      "receivedVolume": 4950,
      "heightLossTruck": 2,
      "heightLossWarehouse": 2
    },
    {
      "compartmentNumber": 2,
      "productId": 2,
      "compartmentHeight": 130,
      "truckTemperature": 31,
      "truckVolume": 8000,
      "warehouseHeight": 129,
      "actualTemperature": 27,
      "receivedVolume": 7980,
      "heightLossTruck": 1,
      "heightLossWarehouse": 1
    }
  ]
}
```

### ✅ Kết Quả
- Tồn kho các bể sẽ **TỰ ĐỘNG TĂNG**
- Ghi vào `inventory_ledger` với `quantityIn`
- Frontend gọi API `/tanks/:id` sẽ thấy `currentStock` đã tăng

---

## 3. Bán Hàng

### 📌 Cách Hoạt Động
Bán hàng được thực hiện khi **đóng ca làm việc** (close shift)

### 🔧 API Endpoint
```http
POST /shifts/:shiftId/close
```

### 📝 Request Body
```json
{
  "shiftId": 1,
  "pumpReadings": [
    {
      "pumpCode": "P001",
      "productId": 1,
      "startValue": 10000,
      "endValue": 10500
    },
    {
      "pumpCode": "P002",
      "productId": 2,
      "startValue": 20000,
      "endValue": 20800
    }
  ]
}
```

### ✅ Kết Quả
- Tạo `PumpReading` và `Sale`
- Ghi vào `inventory_ledger` với `quantityOut` = số lít bán
- Tồn kho bể **TỰ ĐỘNG GIẢM**
- Ghi sổ quỹ (thu tiền)

### 📊 Ví Dụ Chi Tiết
```bash
# Ca 1 - Cửa hàng Tân Bình
# Bơm P001 (nối với Bồn 1 - RON95): 10000 → 10500 = bán 500 lít
# Bơm P002 (nối với Bồn 2 - DO): 20000 → 20800 = bán 800 lít

curl -X POST http://localhost:3000/shifts/1/close \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "shiftId": 1,
    "pumpReadings": [
      {
        "pumpCode": "P001",
        "productId": 1,
        "startValue": 10000,
        "endValue": 10500
      },
      {
        "pumpCode": "P002",
        "productId": 2,
        "startValue": 20000,
        "endValue": 20800
      }
    ]
  }'
```

**Kết quả trong inventory_ledger:**
| tank_id | product_id | ref_type | quantity_in | quantity_out |
|---------|------------|----------|-------------|--------------|
| 1 | 1 | SHIFT_SALE | 0 | 500 |
| 2 | 2 | SHIFT_SALE | 0 | 800 |

---

## 4. Xem Báo Cáo Tồn Kho

### 📊 Báo Cáo 1: Tồn Kho Chi Tiết Theo Bể

#### 🔧 API Endpoint
```http
GET /inventory/stock-report/:storeId
```

#### 📝 Ví Dụ
```bash
curl http://localhost:3000/inventory/stock-report/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### ✅ Response
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
    "currentStock": 4450,
    "fillPercentage": 44.5
  },
  {
    "tankId": 2,
    "tankCode": "T002",
    "tankName": "Bồn 2",
    "productId": 2,
    "productCode": "DO",
    "productName": "Dầu Diesel",
    "capacity": 15000,
    "currentStock": 8720,
    "fillPercentage": 58.13
  }
]
```

### 📊 Báo Cáo 2: Tồn Kho Tất Cả Bể

#### 🔧 API Endpoint
```http
GET /tanks?storeId=1
```

#### ✅ Response
```json
[
  {
    "id": 1,
    "tankCode": "T001",
    "name": "Bồn 1",
    "capacity": 10000,
    "productId": 1,
    "currentStock": 4450,
    "fillPercentage": 44.5,
    "product": {
      "id": 1,
      "code": "XD95",
      "name": "Xăng RON 95"
    }
  }
]
```

### 📊 Báo Cáo 3: Nhập Xuất Tồn Theo Kỳ

#### 🔧 API Endpoint
```http
GET /inventory/report/:warehouseId?fromDate=2026-01-01&toDate=2026-01-31
```

#### ✅ Response
```json
[
  {
    "productId": 1,
    "productCode": "XD95",
    "productName": "Xăng RON 95",
    "unitName": "Lít",
    "openingBalance": 5000,
    "importQuantity": 5000,
    "exportQuantity": 500,
    "closingBalance": 9500
  },
  {
    "productId": 2,
    "productCode": "DO",
    "productName": "Dầu Diesel",
    "unitName": "Lít",
    "openingBalance": 10000,
    "importQuantity": 8000,
    "exportQuantity": 800,
    "closingBalance": 17200
  }
]
```

### 📊 Báo Cáo 4: Chi Tiết Phiếu Nhập Kho

#### 🔧 API Endpoint
```http
GET /reports/inventory-import?storeId=1&fromDate=2026-01-01&toDate=2026-01-31
```

#### ✅ Response
```json
[
  {
    "id": 1,
    "docDate": "2026-01-06",
    "docType": "IMPORT",
    "status": "COMPLETED",
    "supplierName": "Công ty Xăng Dầu ABC",
    "invoiceNumber": "HD-2026-001",
    "licensePlate": "29A-12345",
    "warehouse": {
      "id": 1,
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

## 5. Kiểm Kê & Điều Chỉnh

### 📌 Quy Trình Kiểm Kê

#### Bước 1: Đo Thực Tế
```bash
# Nhân viên đo chiều cao bể → tính lít thực tế
# Ví dụ:
# - Bồn 1: Chiều cao 80cm → 4750 lít (theo bảng tra)
# - Bồn 2: Chiều cao 120cm → 9520 lít
```

#### Bước 2: Xem Tồn Trong Hệ Thống
```bash
curl http://localhost:3000/inventory/stock-report/1
```

#### Bước 3: So Sánh & Điều Chỉnh
```bash
# Nếu có chênh lệch → dùng API nhập tồn đầu để điều chỉnh

curl -X POST http://localhost:3000/inventory/initial-stock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "storeId": 1,
    "effectiveDate": "2026-01-06",
    "notes": "Kiểm kê định kỳ 06/01/2026",
    "items": [
      {
        "tankId": 1,
        "productId": 1,
        "quantity": 4750,
        "notes": "Kiểm kê thực tế"
      },
      {
        "tankId": 2,
        "productId": 2,
        "quantity": 9520,
        "notes": "Kiểm kê thực tế"
      }
    ]
  }'
```

---

## 🎯 Tóm Tắt Workflows

### Workflow 1: Setup Cửa Hàng Mới
```
1. Tạo Store, Tanks, Products trong hệ thống
2. POST /inventory/initial-stock → Nhập tồn đầu
3. GET /tanks?storeId=X → Verify tồn kho đã đúng
```

### Workflow 2: Hoạt Động Hàng Ngày
```
1. Mở ca: POST /shifts (tạo shift mới)
2. Nhập hàng: POST /inventory/documents (khi có xe giao)
3. Bán hàng: Khách mua → số bơm tăng
4. Đóng ca: POST /shifts/:id/close → Tồn tự động giảm
5. Xem báo cáo: GET /inventory/stock-report/:storeId
```

### Workflow 3: Kiểm Kê Cuối Tháng
```
1. Đo thực tế tất cả bể
2. GET /inventory/stock-report/:storeId → So sánh
3. POST /inventory/initial-stock → Điều chỉnh nếu có chênh lệch
4. GET /inventory/report/:warehouseId?fromDate=...&toDate=... → Báo cáo tháng
```

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Quyền Hạn
- **ADMIN, ACCOUNTING**: Được nhập tồn đầu, điều chỉnh
- **STORE**: Chỉ xem báo cáo của cửa hàng mình
- **DIRECTOR**: Xem tất cả báo cáo

### 2. Data Integrity
- **KHÔNG BAO GIỜ** edit trực tiếp `Tank.currentStock` trong database
- Mọi thay đổi tồn kho phải thông qua API
- Tồn kho luôn = `SUM(quantity_in - quantity_out)` từ `inventory_ledger`

### 3. Troubleshooting
```sql
-- Nếu tồn kho sai, kiểm tra ledger
SELECT
  il.*,
  t.tank_code,
  p.name as product_name
FROM inventory_ledger il
LEFT JOIN tanks t ON t.id = il.tank_id
LEFT JOIN product p ON p.id = il.product_id
WHERE il.tank_id = 1
ORDER BY il.created_at DESC
LIMIT 20;

-- Tính lại tồn kho
SELECT
  tank_id,
  SUM(quantity_in - quantity_out) as stock
FROM inventory_ledger
WHERE tank_id = 1;
```

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Check API response status code
2. Xem logs: `pm2 logs swp-backend`
3. Verify data trong database
4. Liên hệ dev team

---

**Cập nhật:** 2026-01-06
**Version:** 2.0.0
**Tác giả:** Development Team
