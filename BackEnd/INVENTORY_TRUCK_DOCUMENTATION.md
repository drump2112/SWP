# Hệ Thống Phiếu Nhập Kho Xăng Dầu Với Xe Téc

## Tổng Quan

Hệ thống này quản lý phiếu nhập kho xăng dầu với xe téc (tank truck) bao gồm:
- Chi tiết từng ngăn xe téc (tối đa 7 ngăn)
- Tính toán hao hụt và giãn nở theo nhiệt độ
- Xác định lượng thừa/thiếu
- Xuất file Excel biên bản giao nhận

## Các Hệ Số Cố Định

### 1. Hệ Số Giãn Nở (β)
- **Xăng các loại**: 0.0013
- **Dầu Diesel**: 0.0009
- **Dầu hỏa**: 0.0010

### 2. Hệ Số Hao Hụt Vận Chuyển (α)
- **Xăng các loại**: 0.00075
- **Dầu Diesel**: 0.0003

### 3. Nhiệt Độ Chuẩn
- **15°C** (theo tiêu chuẩn quốc tế)

## Công Thức Tính Toán

### 1. Quy Đổi Về Nhiệt Độ Chuẩn
```
V₁₅ = Vₜ / [1 + β × (t - 15)]
```
Trong đó:
- V₁₅: Thể tích tại 15°C (lít)
- Vₜ: Thể tích tại nhiệt độ t (lít)
- β: Hệ số giãn nở
- t: Nhiệt độ đo (°C)

### 2. Quy Đổi Sang Nhiệt Độ Khác
```
Vₜ = V₁₅ × [1 + β × (t - 15)]
```

### 3. Hao Hụt Cho Phép
```
Hao hụt cho phép = Thể tích × α
```

### 4. Lượng Thừa/Thiếu
```
Thừa/Thiếu = Thực nhận - Hao hụt thực tế - Hao hụt cho phép
```
- **Dương (+)**: Thừa
- **Âm (-)**: Thiếu
- **0**: Bình thường

## Database Schema

### Bảng: inventory_truck_compartments
Lưu chi tiết từng ngăn xe téc

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | int | Primary key |
| document_id | int | ID phiếu nhập |
| product_id | int | ID sản phẩm |
| compartment_number | int | Số ngăn (1-7) |
| compartment_height | decimal | Chiều cao téc tại ngăn (cm) |
| truck_temperature | decimal | Nhiệt độ tại xe téc (°C) |
| truck_volume | decimal | Thể tích tại nhiệt độ xe téc (lít) |
| warehouse_height | decimal | Chiều cao téc tại kho (cm) |
| actual_temperature | decimal | Nhiệt độ thực tế (°C) |
| actual_volume | decimal | Thể tích tại nhiệt độ thực tế (lít) |
| received_volume | decimal | Lượng thực nhận (lít) |
| loss_volume | decimal | Lượng hao hụt (lít) |
| height_loss_truck | decimal | Hao hụt chiều cao đo đạc tại xe (cm) |
| height_loss_warehouse | decimal | Hao hụt chiều cao téc tại kho (cm) |

### Bảng: inventory_loss_calculations
Lưu kết quả tính toán tổng hợp

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | int | Primary key |
| document_id | int | ID phiếu nhập (unique) |
| expansion_coefficient | decimal | Hệ số giãn nở (β) |
| loss_coefficient | decimal | Hệ số hao hụt (α) |
| total_truck_volume | decimal | Tổng thể tích tại xe téc (lít) |
| total_actual_volume | decimal | Tổng thể tích thực tế (lít) |
| total_received_volume | decimal | Tổng lượng thực nhận (lít) |
| total_loss_volume | decimal | Tổng hao hụt (lít) |
| allowed_loss_volume | decimal | Hao hụt cho phép (lít) |
| excess_shortage_volume | decimal | Lượng thừa/thiếu (lít) |
| temperature_adjustment_volume | decimal | Lượng điều chỉnh do nhiệt độ (lít) |
| notes | text | Ghi chú |

## API Endpoints

### 1. Tạo Phiếu Nhập Kho Với Xe Téc

**Endpoint:** `POST /inventory/documents/with-truck`

**Request Body:**
```json
{
  "storeId": 1,
  "docType": "IMPORT",
  "docDate": "2024-01-15",
  "supplierName": "Công ty xăng dầu ABC",
  "invoiceNumber": "HD001",
  "licensePlate": "29A-12345",
  "driverName": "Nguyễn Văn A",
  "driverPhone": "0901234567",
  "compartments": [
    {
      "compartmentNumber": 1,
      "productId": 1,
      "compartmentHeight": 125.5,
      "truckTemperature": 28.5,
      "truckVolume": 5000,
      "warehouseHeight": 124.8,
      "actualTemperature": 26.0,
      "actualVolume": 4985.2,
      "receivedVolume": 4980,
      "heightLossTruck": 0.5,
      "heightLossWarehouse": 0.7
    },
    {
      "compartmentNumber": 2,
      "productId": 1,
      "compartmentHeight": 120.0,
      "truckTemperature": 28.0,
      "truckVolume": 4800,
      "warehouseHeight": 119.5,
      "actualTemperature": 26.0,
      "actualVolume": 4786.4,
      "receivedVolume": 4782,
      "heightLossTruck": 0.3,
      "heightLossWarehouse": 0.5
    }
  ],
  "notes": "Nhập hàng đợt 1 tháng 1/2024"
}
```

**Response:**
```json
{
  "document": {
    "id": 1,
    "warehouseId": 1,
    "docType": "IMPORT",
    "docDate": "2024-01-15",
    "status": "COMPLETED",
    "supplierName": "Công ty xăng dầu ABC",
    "invoiceNumber": "HD001",
    "licensePlate": "29A-12345"
  },
  "calculation": {
    "expansionCoeff": 0.0013,
    "lossCoeff": 0.00075,
    "totalTruckVolume": 9800,
    "totalActualVolume": 9771.6,
    "totalReceivedVolume": 9762,
    "totalLossVolume": 38,
    "allowedLossVolume": 7.35,
    "excessShortageVolume": -30.65,
    "temperatureAdjustmentVolume": -28.4,
    "status": "SHORTAGE"
  }
}
```

### 2. Lấy Chi Tiết Phiếu Nhập

**Endpoint:** `GET /inventory/documents/with-truck/:documentId`

**Response:**
```json
{
  "id": 1,
  "docDate": "2024-01-15",
  "docType": "IMPORT",
  "supplierName": "Công ty xăng dầu ABC",
  "invoiceNumber": "HD001",
  "licensePlate": "29A-12345",
  "status": "COMPLETED",
  "warehouse": {
    "id": 1,
    "type": "STORE",
    "storeName": "Cửa hàng Tân Bình"
  },
  "compartments": [
    {
      "compartmentNumber": 1,
      "productName": "Xăng RON 95",
      "productCode": "XD95",
      "truckVolume": 5000,
      "actualVolume": 4985.2,
      "receivedVolume": 4980,
      "lossVolume": 20,
      "truckTemperature": 28.5,
      "actualTemperature": 26,
      "compartmentHeight": 125.5,
      "warehouseHeight": 124.8,
      "heightLossTruck": 0.5,
      "heightLossWarehouse": 0.7
    }
  ],
  "calculation": {
    "expansionCoefficient": 0.0013,
    "lossCoefficient": 0.00075,
    "totalTruckVolume": 9800,
    "totalActualVolume": 9771.6,
    "totalReceivedVolume": 9762,
    "totalLossVolume": 38,
    "allowedLossVolume": 7.35,
    "excessShortageVolume": -30.65,
    "temperatureAdjustmentVolume": -28.4,
    "status": "SHORTAGE",
    "notes": "Nhập hàng đợt 1 tháng 1/2024"
  }
}
```

### 3. Xuất File Excel

**Endpoint:** `GET /inventory/documents/with-truck/:documentId/export-excel`

**Response:** File Excel với tên `Bien_ban_giao_nhan_HD001.xlsx`

**Nội dung file Excel bao gồm:**
- Tiêu đề và thông tin phiếu
- Bảng chi tiết từng ngăn xe téc
- Tổng cộng
- Kết quả tính toán (hệ số, hao hụt, thừa/thiếu)
- Chỗ ký của người giao, người nhận, thủ kho

## Ví Dụ Sử Dụng

### 1. Tạo phiếu nhập kho 3 ngăn

```bash
curl -X POST http://localhost:3000/inventory/documents/with-truck \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "storeId": 1,
    "docType": "IMPORT",
    "docDate": "2024-01-15",
    "supplierName": "Công ty Petrolimex",
    "invoiceNumber": "PX2024001",
    "licensePlate": "29B-67890",
    "compartments": [
      {
        "compartmentNumber": 1,
        "productId": 1,
        "truckVolume": 5000,
        "truckTemperature": 30,
        "actualTemperature": 25,
        "receivedVolume": 4950,
        "compartmentHeight": 130,
        "warehouseHeight": 129
      },
      {
        "compartmentNumber": 2,
        "productId": 1,
        "truckVolume": 4500,
        "truckTemperature": 29,
        "actualTemperature": 25,
        "receivedVolume": 4460,
        "compartmentHeight": 125,
        "warehouseHeight": 124.5
      },
      {
        "compartmentNumber": 3,
        "productId": 2,
        "truckVolume": 3000,
        "truckTemperature": 28,
        "actualTemperature": 25,
        "receivedVolume": 2980,
        "compartmentHeight": 110,
        "warehouseHeight": 109.5
      }
    ]
  }'
```

### 2. Xem chi tiết phiếu

```bash
curl http://localhost:3000/inventory/documents/with-truck/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Xuất file Excel

```bash
curl http://localhost:3000/inventory/documents/with-truck/1/export-excel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o bien_ban_giao_nhan.xlsx
```

## Quy Trình Nghiệp Vụ

### Bước 1: Đo đạc tại xe téc
1. Đo chiều cao téc từng ngăn
2. Đo nhiệt độ từng ngăn
3. Ghi nhận lượng lít tại nhiệt độ xe téc

### Bước 2: Vận chuyển về kho
- Xe téc di chuyển từ nhà cung cấp về kho
- Có hao hụt tự nhiên do vận chuyển

### Bước 3: Đo đạc tại kho
1. Đo lại chiều cao téc sau khi về kho
2. Đo nhiệt độ thực tế tại kho
3. Tính toán lượng thực nhận

### Bước 4: Tính toán
Hệ thống tự động:
1. Quy đổi thể tích về nhiệt độ chuẩn 15°C
2. Quy đổi sang nhiệt độ thực tế
3. Tính hao hụt cho phép
4. So sánh với hao hụt thực tế
5. Xác định thừa/thiếu

### Bước 5: Xuất biên bản
- Xuất file Excel
- In ra giấy
- Ký xác nhận: Người giao, Người nhận, Thủ kho

## Lưu Ý Kỹ Thuật

1. **Độ chính xác**: Tất cả tính toán sử dụng decimal với 3 chữ số thập phân
2. **Đơn vị**:
   - Thể tích: Lít
   - Nhiệt độ: °C (Celsius)
   - Chiều cao: cm
3. **Validation**:
   - Số ngăn: 1-7
   - Nhiệt độ: Thường 0-50°C
   - Thể tích: > 0
4. **Hệ số**: Tự động chọn dựa trên mã sản phẩm (XD*, DO*, DHO*)

## Troubleshooting

### Lỗi: "Product not found"
- Đảm bảo productId tồn tại trong database
- Kiểm tra product có mã code hợp lệ

### Lỗi: "Warehouse not found"
- Cung cấp warehouseId hoặc storeId
- Hệ thống sẽ tự tạo warehouse nếu chưa có

### Kết quả tính toán sai
- Kiểm tra lại nhiệt độ đầu vào
- Xác nhận mã sản phẩm để chọn đúng hệ số
- Kiểm tra công thức trong PetroleumCalculationService

## Migration Scripts

Tạo bảng mới:

```sql
-- Bảng chi tiết ngăn xe téc
CREATE TABLE inventory_truck_compartments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  product_id INT,
  compartment_number INT NOT NULL,
  compartment_height DECIMAL(10,2),
  truck_temperature DECIMAL(5,2),
  truck_volume DECIMAL(18,3),
  warehouse_height DECIMAL(10,2),
  actual_temperature DECIMAL(5,2),
  actual_volume DECIMAL(18,3),
  received_volume DECIMAL(18,3),
  loss_volume DECIMAL(18,3),
  height_loss_truck DECIMAL(10,2),
  height_loss_warehouse DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES inventory_documents(id),
  FOREIGN KEY (product_id) REFERENCES product(id)
);

-- Bảng tính toán hao hụt
CREATE TABLE inventory_loss_calculations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL UNIQUE,
  expansion_coefficient DECIMAL(10,6),
  loss_coefficient DECIMAL(10,6),
  total_truck_volume DECIMAL(18,3),
  total_actual_volume DECIMAL(18,3),
  total_received_volume DECIMAL(18,3),
  total_loss_volume DECIMAL(18,3),
  allowed_loss_volume DECIMAL(18,3),
  excess_shortage_volume DECIMAL(18,3),
  temperature_adjustment_volume DECIMAL(18,3),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES inventory_documents(id)
);
```
