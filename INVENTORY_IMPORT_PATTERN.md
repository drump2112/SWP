# Pattern Phân Tích - Báo Cáo Phiếu Nhập Kho

## Tổng quan Pattern

Chức năng báo cáo phiếu nhập kho được xây dựng theo pattern nhất quán với các báo cáo khác trong hệ thống (công nợ, sổ quỹ, xuất hàng).

## Cấu trúc Pattern

### 1. File Structure
```
BackEnd/src/
├── reports/
│   ├── reports.controller.ts    # API endpoints
│   ├── reports.service.ts        # Business logic
│   └── reports.module.ts         # Module configuration
├── entities/
│   ├── inventory-document.entity.ts
│   ├── inventory-document-item.entity.ts
│   ├── product.entity.ts
│   └── warehouse.entity.ts
└── inventory/
    └── inventory.service.ts      # Existing inventory logic
```

### 2. Service Pattern (reports.service.ts)

#### Method 1: Danh sách phiếu nhập (List)
```typescript
async getInventoryImportReport(params: {
  warehouseId?: number;
  storeId?: number;
  fromDate?: Date;
  toDate?: Date;
  docType?: string;
})
```
**Pattern:**
- Build query với QueryBuilder
- Apply filters (warehouse, store, date range, docType)
- Join relations (warehouse, store, items, product, tank)
- Format response với calculations (totalQuantity, totalAmount)

**Tương tự:**
- `getDebtReport()` - Báo cáo công nợ
- `getCashReport()` - Báo cáo sổ quỹ

#### Method 2: Chi tiết phiếu (Detail)
```typescript
async getInventoryImportDocumentDetail(documentId: number)
```
**Pattern:**
- Find one document by ID
- Load all relations
- Calculate totals
- Format detailed response

**Tương tự:**
- `getShiftDetailReport()` - Chi tiết ca làm việc

#### Method 3: Tổng hợp theo nhóm (Summary/Grouping)
```typescript
async getInventoryImportSummaryByProduct(params)
async getInventoryImportSummaryBySupplier(params)
```
**Pattern:**
- Use QueryBuilder with GROUP BY
- Aggregate functions (SUM, COUNT)
- Filter by date range and location
- Calculate derived values (averagePrice)

**Tương tự:**
- `getSalesByPumpReport()` - Tổng hợp theo cột bơm
- `getSalesByProductReport()` - Tổng hợp theo mặt hàng

### 3. Controller Pattern (reports.controller.ts)

```typescript
@Get('inventory-import')
@Roles('STORE', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
getInventoryImportReport(
  @CurrentUser() user: any,
  @Query('warehouseId') warehouseId?: string,
  @Query('storeId') storeId?: string,
  @Query('fromDate') fromDate?: string,
  @Query('toDate') toDate?: string,
)
```

**Pattern Elements:**
1. **Route Naming**: Descriptive, RESTful (`inventory-import`, `inventory-import/:id`)
2. **Guards**: `@UseGuards(JwtAuthGuard, RolesGuard)` ở class level
3. **Authorization**: `@Roles()` decorator cho từng endpoint
4. **User Context**: `@CurrentUser()` để lấy thông tin user hiện tại
5. **Query Parameters**: Parse và validate parameters
6. **Store-based filtering**:
   ```typescript
   const effectiveStoreId = user.roleCode === 'STORE'
     ? user.storeId
     : (storeId ? +storeId : undefined);
   ```
7. **Type Conversion**: String to Number (+storeId), String to Date (new Date())

### 4. Module Pattern (reports.module.ts)

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Existing entities
      DebtLedger,
      Sale,
      CashLedger,
      // New entities for inventory reports
      InventoryDocument,
      InventoryDocumentItem,
      Product,
      Warehouse,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
```

**Pattern:**
- Import tất cả entities cần thiết
- Export service để module khác sử dụng

## Phân tích Template Files

### Mẫu phân tích (analyze_*_template.py)
```python
import pandas as pd
import os

file_path = '/path/to/template.xlsx'

print(f"\n--- Analyzing {os.path.basename(file_path)} ---")
try:
    df = pd.read_excel(file_path, header=None, nrows=30)
    for index, row in df.iterrows():
        row_content = [str(x) for x in row if pd.notna(x)]
        if row_content:
            print(f"Row {index}: {row_content}")
except Exception as e:
    print(f"Error: {e}")
```

**Mục đích:**
- Hiểu cấu trúc file Excel mẫu
- Xác định vị trí header, data rows
- Thiết kế format cho export Excel sau này

## Key Patterns & Best Practices

### 1. Query Building Pattern
```typescript
const query = this.repository.createQueryBuilder('alias')
  .leftJoinAndSelect('alias.relation', 'relation')
  .select('alias.field', 'fieldAlias')
  .addSelect('SUM(alias.amount)', 'total')
  .where('alias.field = :value', { value })
  .andWhere('alias.date >= :fromDate', { fromDate })
  .groupBy('alias.field')
  .orderBy('alias.field', 'ASC');
```

### 2. Date Range Pattern
```typescript
// Include end date fully
if (toDate) {
  const nextDay = new Date(toDate);
  nextDay.setDate(nextDay.getDate() + 1);
  query.andWhere('doc.docDate < :toDate', { toDate: nextDay });
}
```

### 3. Conditional Filtering Pattern
```typescript
if (param1) {
  query.andWhere('field1 = :param1', { param1 });
}
if (param2) {
  query.andWhere('field2 = :param2', { param2 });
}
```

### 4. Response Formatting Pattern
```typescript
return results.map((item) => ({
  id: item.id,
  name: item.name,
  quantity: Number(item.quantity || 0),
  amount: Number(item.amount || 0),
  calculatedField: item.qty * item.price,
  relation: {
    id: item.relation?.id,
    name: item.relation?.name || 'N/A',
  },
}));
```

### 5. Error Handling Pattern
```typescript
const document = await this.repository.findOne({ where: { id } });
if (!document) {
  throw new Error('Document not found');
}
```

### 6. Access Control Pattern
```typescript
// In Controller
const effectiveStoreId = user.roleCode === 'STORE'
  ? user.storeId  // STORE users: auto-filter by their store
  : (storeId ? +storeId : undefined);  // Others: optional filter

// In Service
if (storeId) {
  query.andWhere('warehouse.storeId = :storeId', { storeId });
}
```

## So sánh với các báo cáo tương tự

| Feature | Debt Report | Cash Report | Inventory Import |
|---------|-------------|-------------|------------------|
| List với filters | ✅ | ✅ | ✅ |
| Chi tiết item | ✅ | ✅ | ✅ |
| Tổng hợp theo nhóm | ✅ | ❌ | ✅ |
| Store-based access | ✅ | ✅ | ✅ |
| Date range filter | ✅ | ✅ | ✅ |
| Join multiple tables | ✅ | ✅ | ✅ |
| Calculate totals | ✅ | ✅ | ✅ |

## Files Created/Modified

### Created:
1. `/BackEnd/INVENTORY_IMPORT_REPORTS.md` - API Documentation
2. `/analyze_inventory_import_template.py` - Template analyzer

### Modified:
1. `/BackEnd/src/reports/reports.service.ts` - Added 4 new methods
2. `/BackEnd/src/reports/reports.controller.ts` - Added 4 new endpoints
3. `/BackEnd/src/reports/reports.module.ts` - Added 4 new entities

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/reports/inventory-import` | GET | Danh sách phiếu nhập kho |
| `/reports/inventory-import/:id` | GET | Chi tiết phiếu nhập |
| `/reports/inventory-import-summary/by-product` | GET | Tổng hợp theo mặt hàng |
| `/reports/inventory-import-summary/by-supplier` | GET | Tổng hợp theo NCC |

## Kết luận

Pattern này đảm bảo:
- ✅ Consistency với các báo cáo khác
- ✅ Proper authorization & access control
- ✅ Flexible filtering options
- ✅ Clean code structure
- ✅ Type safety
- ✅ Proper error handling
- ✅ Optimized queries with joins
- ✅ Clear documentation
