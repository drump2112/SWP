# Báo Cáo Phiếu Nhập Kho (Inventory Import Reports)

## Tổng quan

Tài liệu này mô tả các API báo cáo phiếu nhập kho, được xây dựng theo pattern tương tự như các báo cáo khác trong hệ thống (công nợ, sổ quỹ, v.v.).

## Các API Endpoints

### 1. Bảng Kê Nhập Kho (Inventory Import List)

**Endpoint:** `GET /reports/inventory-import`

**Mô tả:** Lấy danh sách các phiếu nhập kho với chi tiết các mặt hàng

**Query Parameters:**
- `warehouseId` (optional): ID kho
- `storeId` (optional): ID cửa hàng
- `fromDate` (optional): Từ ngày (YYYY-MM-DD)
- `toDate` (optional): Đến ngày (YYYY-MM-DD)
- `docType` (optional): Loại phiếu (IMPORT, TRANSFER_IN) - mặc định lấy cả hai

**Quyền truy cập:**
- STORE: Chỉ xem phiếu nhập của cửa hàng mình
- ACCOUNTING, DIRECTOR, ADMIN: Xem tất cả

**Response:**
```json
[
  {
    "id": 1,
    "docDate": "2024-01-15",
    "docType": "IMPORT",
    "status": "COMPLETED",
    "supplierName": "Công ty xăng dầu ABC",
    "invoiceNumber": "HD001",
    "licensePlate": "29A-12345",
    "warehouse": {
      "id": 1,
      "type": "STORE",
      "storeName": "Cửa hàng Tân Bình",
      "storeCode": "CH001"
    },
    "items": [
      {
        "id": 1,
        "productId": 1,
        "productCode": "XD95",
        "productName": "Xăng RON 95",
        "quantity": 5000,
        "unitPrice": 21000,
        "amount": 105000000,
        "tankCode": "T001",
        "tankName": "Bồn 1"
      }
    ],
    "totalQuantity": 5000,
    "totalAmount": 105000000
  }
]
```

**Ví dụ sử dụng:**
```
GET /reports/inventory-import?storeId=1&fromDate=2024-01-01&toDate=2024-01-31
GET /reports/inventory-import?warehouseId=1&docType=IMPORT
GET /reports/inventory-import?fromDate=2024-01-01&toDate=2024-12-31
```

---

### 2. Chi Tiết Phiếu Nhập Kho (Import Document Detail)

**Endpoint:** `GET /reports/inventory-import/:documentId`

**Mô tả:** Lấy chi tiết một phiếu nhập kho cụ thể

**Path Parameters:**
- `documentId`: ID phiếu nhập kho

**Quyền truy cập:**
- STORE, ACCOUNTING, DIRECTOR, ADMIN

**Response:**
```json
{
  "id": 1,
  "docDate": "2024-01-15",
  "docType": "IMPORT",
  "status": "COMPLETED",
  "supplierName": "Công ty xăng dầu ABC",
  "invoiceNumber": "HD001",
  "licensePlate": "29A-12345",
  "warehouse": {
    "id": 1,
    "type": "STORE",
    "storeName": "Cửa hàng Tân Bình",
    "storeCode": "CH001"
  },
  "items": [
    {
      "id": 1,
      "productId": 1,
      "productCode": "XD95",
      "productName": "Xăng RON 95",
      "quantity": 5000,
      "unitPrice": 21000,
      "amount": 105000000,
      "tankId": 1,
      "tankCode": "T001",
      "tankName": "Bồn 1"
    },
    {
      "id": 2,
      "productId": 2,
      "productCode": "DO",
      "productName": "Dầu Diesel",
      "quantity": 3000,
      "unitPrice": 19000,
      "amount": 57000000,
      "tankId": 2,
      "tankCode": "T002",
      "tankName": "Bồn 2"
    }
  ],
  "totalQuantity": 8000,
  "totalAmount": 162000000
}
```

**Ví dụ sử dụng:**
```
GET /reports/inventory-import/1
GET /reports/inventory-import/123
```

---

### 3. Tổng Hợp Nhập Kho Theo Mặt Hàng (Summary by Product)

**Endpoint:** `GET /reports/inventory-import-summary/by-product`

**Mô tả:** Báo cáo tổng hợp nhập kho theo từng mặt hàng trong khoảng thời gian

**Query Parameters:**
- `warehouseId` (optional): ID kho
- `storeId` (optional): ID cửa hàng
- `fromDate` (optional): Từ ngày
- `toDate` (optional): Đến ngày

**Quyền truy cập:**
- ACCOUNTING, DIRECTOR, ADMIN

**Response:**
```json
[
  {
    "productId": 1,
    "productCode": "XD95",
    "productName": "Xăng RON 95",
    "totalQuantity": 15000,
    "totalAmount": 315000000,
    "documentCount": 3,
    "averagePrice": 21000
  },
  {
    "productId": 2,
    "productCode": "DO",
    "productName": "Dầu Diesel",
    "totalQuantity": 10000,
    "totalAmount": 190000000,
    "documentCount": 2,
    "averagePrice": 19000
  }
]
```

**Ví dụ sử dụng:**
```
GET /reports/inventory-import-summary/by-product?storeId=1&fromDate=2024-01-01&toDate=2024-01-31
GET /reports/inventory-import-summary/by-product?warehouseId=1&fromDate=2024-01-01&toDate=2024-12-31
```

---

### 4. Tổng Hợp Nhập Kho Theo Nhà Cung Cấp (Summary by Supplier)

**Endpoint:** `GET /reports/inventory-import-summary/by-supplier`

**Mô tả:** Báo cáo tổng hợp nhập kho theo từng nhà cung cấp

**Query Parameters:**
- `warehouseId` (optional): ID kho
- `storeId` (optional): ID cửa hàng
- `fromDate` (optional): Từ ngày
- `toDate` (optional): Đến ngày

**Quyền truy cập:**
- ACCOUNTING, DIRECTOR, ADMIN

**Response:**
```json
[
  {
    "supplierName": "Công ty xăng dầu ABC",
    "documentCount": 5,
    "totalAmount": 500000000
  },
  {
    "supplierName": "Công ty xăng dầu XYZ",
    "documentCount": 3,
    "totalAmount": 300000000
  }
]
```

**Ví dụ sử dụng:**
```
GET /reports/inventory-import-summary/by-supplier?storeId=1&fromDate=2024-01-01&toDate=2024-01-31
GET /reports/inventory-import-summary/by-supplier?fromDate=2024-01-01&toDate=2024-12-31
```

---

## Pattern Implementation

Các API này được xây dựng theo pattern tương tự như các báo cáo khác trong hệ thống:

### 1. Service Layer (`reports.service.ts`)
- **getInventoryImportReport()**: Lấy danh sách phiếu nhập với filter
- **getInventoryImportDocumentDetail()**: Chi tiết một phiếu nhập
- **getInventoryImportSummaryByProduct()**: Tổng hợp theo mặt hàng
- **getInventoryImportSummaryBySupplier()**: Tổng hợp theo nhà cung cấp

### 2. Controller Layer (`reports.controller.ts`)
- Xử lý authentication & authorization
- Parse query parameters
- Áp dụng store filter cho user STORE role
- Call service methods

### 3. Module Layer (`reports.module.ts`)
- Import các TypeORM entities cần thiết:
  - InventoryDocument
  - InventoryDocumentItem
  - Product
  - Warehouse

### 4. Tương tự các pattern khác:
- **Debt Report**: Báo cáo công nợ theo khách hàng
- **Cash Report**: Báo cáo sổ quỹ tiền mặt
- **Sales Report**: Báo cáo xuất hàng theo cột bơm/mặt hàng

## Lưu ý kỹ thuật

1. **Date Filtering**: Khi filter theo ngày, cần cộng thêm 1 ngày cho toDate để bao gồm toàn bộ ngày cuối
   ```typescript
   const nextDay = new Date(toDate);
   nextDay.setDate(nextDay.getDate() + 1);
   query.andWhere('doc.docDate < :toDate', { toDate: nextDay });
   ```

2. **Document Types**: Mặc định lấy cả IMPORT và TRANSFER_IN (phiếu nhập từ kho khác)
   ```typescript
   query.andWhere('doc.docType IN (:...docTypes)', {
     docTypes: ['IMPORT', 'TRANSFER_IN']
   });
   ```

3. **Store-based Access Control**: User role STORE chỉ xem được dữ liệu của cửa hàng mình
   ```typescript
   const effectiveStoreId = user.roleCode === 'STORE'
     ? user.storeId
     : (storeId ? +storeId : undefined);
   ```

4. **Relations Loading**: Sử dụng leftJoinAndSelect để load các quan hệ cần thiết
   ```typescript
   .leftJoinAndSelect('doc.warehouse', 'warehouse')
   .leftJoinAndSelect('warehouse.store', 'store')
   .leftJoinAndSelect('doc.items', 'items')
   .leftJoinAndSelect('items.product', 'product')
   ```

## Testing

Để test các API này, sử dụng các endpoint với JWT token hợp lệ:

```bash
# Test bảng kê nhập kho
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/reports/inventory-import?storeId=1&fromDate=2024-01-01&toDate=2024-01-31"

# Test chi tiết phiếu nhập
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/reports/inventory-import/1"

# Test tổng hợp theo mặt hàng
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/reports/inventory-import-summary/by-product?storeId=1&fromDate=2024-01-01&toDate=2024-01-31"

# Test tổng hợp theo nhà cung cấp
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/reports/inventory-import-summary/by-supplier?fromDate=2024-01-01&toDate=2024-12-31"
```
