# 🚀 Quick Start - Sử Dụng Hệ Thống Nhập Xuất Tồn

## 📝 3 Bước Cơ Bản

### 1️⃣ NHẬP TỒN ĐẦU (Lần Đầu Tiên)

**API:** `POST /inventory/initial-stock`

```bash
curl -X POST http://localhost:3000/inventory/initial-stock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "storeId": 1,
    "effectiveDate": "2026-01-06",
    "notes": "Setup cửa hàng Tân Bình",
    "items": [
      {"tankId": 1, "productId": 1, "quantity": 5000},
      {"tankId": 2, "productId": 2, "quantity": 8000}
    ]
  }'
```

**Kết quả:** Các bể có tồn ban đầu

---

### 2️⃣ NHẬP HÀNG (Khi Có Xe Giao)

**API:** `POST /inventory/documents`

```bash
curl -X POST http://localhost:3000/inventory/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "storeId": 1,
    "docType": "IMPORT",
    "docDate": "2026-01-06",
    "supplierName": "Công ty XD ABC",
    "invoiceNumber": "HD001",
    "licensePlate": "29A-12345",
    "items": [
      {
        "productId": 1,
        "tankId": 1,
        "quantity": 3000,
        "unitPrice": 21000
      }
    ]
  }'
```

**Kết quả:** Tồn bể tăng 3000 lít

---

### 3️⃣ BÁN HÀNG (Đóng Ca)

**API:** `POST /shifts/:shiftId/close`

```bash
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
      }
    ]
  }'
```

**Kết quả:** Tồn bể giảm 500 lít (10500 - 10000)

---

## 📊 XEM BÁO CÁO

### Tồn Kho Hiện Tại
```bash
GET /inventory/stock-report/1
```

**Response:**
```json
[
  {
    "tankCode": "T001",
    "tankName": "Bồn 1",
    "productName": "Xăng RON 95",
    "capacity": 10000,
    "currentStock": 7500,
    "fillPercentage": 75
  }
]
```

### Nhập Xuất Tồn Theo Tháng
```bash
GET /inventory/report/1?fromDate=2026-01-01&toDate=2026-01-31
```

**Response:**
```json
[
  {
    "productName": "Xăng RON 95",
    "openingBalance": 5000,
    "importQuantity": 3000,
    "exportQuantity": 500,
    "closingBalance": 7500
  }
]
```

### Danh Sách Phiếu Nhập
```bash
GET /reports/inventory-import?storeId=1&fromDate=2026-01-01&toDate=2026-01-31
```

---

## 🔄 KIỂM KÊ & ĐIỀU CHỈNH

**Khi nào cần:**
- Cuối tháng/quý
- Phát hiện chênh lệch tồn kho
- Sau sự cố (tràn, rò rỉ, v.v.)

**Cách thực hiện:**
```bash
# Bước 1: Đo thực tế → 4750 lít
# Bước 2: Xem hệ thống → 4800 lít
# Bước 3: Điều chỉnh

POST /inventory/initial-stock
{
  "storeId": 1,
  "effectiveDate": "2026-01-06",
  "notes": "Kiểm kê định kỳ",
  "items": [
    {"tankId": 1, "productId": 1, "quantity": 4750}
  ]
}
```

---

## ⚡ TIP & TRICKS

### 1. Xem Tồn Kho Nhanh
```bash
# Tất cả bể trong cửa hàng
GET /tanks?storeId=1

# Một bể cụ thể
GET /tanks/1
```

### 2. Tính Công Thức
```
Tồn Hiện Tại = SUM(Nhập) - SUM(Xuất)
              = SUM(quantity_in - quantity_out)
```

### 3. Phân Quyền
| Vai Trò | Nhập Tồn Đầu | Nhập Hàng | Bán Hàng | Xem Báo Cáo |
|---------|---------------|-----------|----------|-------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ Tất cả |
| ACCOUNTING | ✅ | ✅ | ❌ | ✅ Tất cả |
| STORE | ❌ | ✅ | ✅ | ✅ Của hàng mình |

---

## 🆘 TROUBLESHOOTING

### Vấn Đề 1: Tồn Kho Sai
```sql
-- Kiểm tra ledger
SELECT * FROM inventory_ledger WHERE tank_id = 1 ORDER BY created_at DESC LIMIT 10;

-- Tính lại
SELECT tank_id, SUM(quantity_in - quantity_out) FROM inventory_ledger WHERE tank_id = 1;
```

### Vấn Đề 2: API Trả Về Lỗi
- Check token còn hạn không
- Check quyền (roles) của user
- Xem logs: `pm2 logs swp-backend`

### Vấn Đề 3: Frontend Không Hiển Thị
- Verify API response: `curl http://localhost:3000/tanks/1`
- Check console browser
- Clear cache

---

## 📚 TÀI LIỆU CHI TIẾT

Đọc thêm:
- **[USER_GUIDE_INVENTORY.md](USER_GUIDE_INVENTORY.md)** - Hướng dẫn đầy đủ
- **[INVENTORY_REFACTOR_DOCUMENTATION.md](INVENTORY_REFACTOR_DOCUMENTATION.md)** - Tài liệu kỹ thuật
- **[DEPLOYMENT_GUIDE_INVENTORY.md](DEPLOYMENT_GUIDE_INVENTORY.md)** - Hướng dẫn deploy

---

**Quick Reference Card**
**Version:** 2.0.0
**Updated:** 2026-01-06

**Print this page for quick access!** 🖨️
