# Báo cáo Công Nợ - Cải tiến Chi tiết

## Tổng quan
Đã cập nhật báo cáo công nợ để hiển thị đầy đủ thông tin chi tiết theo từng giao dịch, bao gồm thông tin sản phẩm, số lượng, và đơn giá tại thời điểm bán.

## Các cải tiến đã thực hiện

### 1. Backend - Reports Service ✅
**File:** `BackEnd/src/reports/reports.service.ts`

**Cải tiến:**
- Lấy chi tiết từ bảng `shift_debt_sales` để hiển thị thông tin sản phẩm
- Mỗi giao dịch DEBT_SALE giờ bao gồm:
  - Tên sản phẩm (Xăng RON95, Dầu DO, v.v.)
  - Số lượng (lít)
  - Đơn giá tại thời điểm bán
  - Thành tiền
- Ghi chú (notes) cho mỗi giao dịch

**Code mới:**
```typescript
// Lấy chi tiết từ shift_debt_sales để hiển thị sản phẩm, số lượng, giá
const ledgersWithDetails = await Promise.all(
  ledgers.map(async (l) => {
    let productDetails = null;

    if (l.refType === 'DEBT_SALE' && l.refId) {
      const debtSale = await this.shiftDebtSaleRepository.findOne({
        where: { id: l.refId },
        relations: ['product'],
      });

      if (debtSale) {
        productDetails = {
          productName: debtSale.product?.name || 'N/A',
          quantity: Number(debtSale.quantity),
          unitPrice: Number(debtSale.unitPrice),
          amount: Number(debtSale.amount),
        };
      }
    }

    return {
      id: l.id,
      date: l.createdAt,
      refType: l.refType,
      refId: l.refId,
      debit: Number(l.debit),
      credit: Number(l.credit),
      notes: l.notes,
      productDetails, // Thông tin sản phẩm nếu là DEBT_SALE
    };
  }),
);
```

### 2. Frontend - Debt Report Page ✅
**File:** `FrontEnd/src/pages/DebtReportPage.tsx`

**Cải tiến:**
- Bảng chi tiết mở rộng với các cột mới:
  - **Sản phẩm**: Hiển thị tên sản phẩm (Xăng, Dầu)
  - **Số lượng (L)**: Số lít đã bán
  - **Đơn giá (₫/L)**: Giá bán tại thời điểm giao dịch
  - **Nợ (₫)**: Số tiền phát sinh nợ
  - **Có (₫)**: Số tiền thu về
  - **Ghi chú**: Thông tin bổ sung

**Giao diện:**
```
| Ngày | Loại | Sản phẩm | Số lượng (L) | Đơn giá (₫/L) | Nợ (₫) | Có (₫) | Ghi chú |
|------|------|----------|--------------|----------------|--------|--------|---------|
```

**Đặc điểm:**
- Badge màu cho loại giao dịch (Bán nợ = đỏ, Thu tiền = xanh)
- Format số đẹp với font-mono cho số liệu
- Hover effect trên mỗi dòng
- Hiển thị "-" cho các trường không có dữ liệu

### 3. Entity - Debt Ledger ✅
**File:** `BackEnd/src/entities/debt-ledger.entity.ts`

**Cải tiến:**
- Thêm trường `notes: string` để lưu ghi chú cho mỗi giao dịch

### 4. Migration ✅
**File:** `BackEnd/src/migrations/1735924800000-AddNotesToDebtLedger.ts`

**Cải tiến:**
- Migration để thêm cột `notes` vào bảng `debt_ledger`
- Kiểm tra tồn tại trước khi thêm (tránh lỗi nếu đã có)

## Ví dụ minh họa

### Trước khi cải tiến:
```
Chi tiết phát sinh:
| Ngày       | Loại      | Nợ          | Có         | Ghi chú |
|------------|-----------|-------------|------------|---------|
| 01/03 8:00 | DEBT_SALE | 30,000,000₫ | -          | -       |
| 15/03 14:00| PAYMENT   | -           | 25,000,000₫| -       |
```

### Sau khi cải tiến:
```
Chi tiết phát sinh:
| Ngày       | Loại    | Sản phẩm    | Số lượng | Đơn giá  | Nợ          | Có         | Ghi chú      |
|------------|---------|-------------|----------|----------|-------------|------------|--------------|
| 01/03 8:00 | Bán nợ  | Xăng RON95  | 1,500.00 | 20,000   | 30,000,000₫ | -          | Bán công nợ  |
| 15/03 14:00| Thu tiền| -           | -        | -        | -           | 25,000,000₫| Thu nợ KH A  |
```

## Lợi ích

### 1. Theo dõi giá theo thời kỳ ✅
- Mỗi giao dịch lưu giá tại thời điểm bán
- Phù hợp với đặc thù xăng dầu (giá thay đổi hàng tuần)
- Dễ đối chiếu và kiểm soát

### 2. Chi tiết minh bạch ✅
- Biết rõ khách hàng mua sản phẩm gì
- Mua bao nhiêu lít
- Giá bán là bao nhiêu
- Tổng tiền phải trả

### 3. Phù hợp nghiệp vụ ✅
- Đúng với yêu cầu nghiệp vụ xăng dầu
- Giá thay đổi 1 tuần/lần
- Dễ kiểm soát công nợ theo từng sản phẩm

## Cách sử dụng

### 1. Chạy migration
```bash
cd BackEnd
npm run migration:run
```

### 2. Khởi động lại backend
```bash
npm run start:dev
```

### 3. Truy cập báo cáo công nợ
- Vào menu "Báo cáo" > "Báo cáo công nợ"
- Chọn khách hàng và kỳ báo cáo
- Nhấn "Chi tiết" để xem thông tin chi tiết từng giao dịch

## Lưu ý kỹ thuật

### Database Schema
```sql
-- Bảng debt_ledger (đã cập nhật)
CREATE TABLE debt_ledger (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  store_id INT,
  ref_type VARCHAR(50),    -- DEBT_SALE, PAYMENT, RECEIPT
  ref_id INT,              -- Link đến shift_debt_sales hoặc receipts
  debit DECIMAL(18,2),
  credit DECIMAL(18,2),
  notes TEXT,              -- ← MỚI THÊM
  created_at TIMESTAMP,
  INDEX idx_debt_ledger_customer (customer_id, created_at)
);

-- Bảng shift_debt_sales (đã có sẵn)
CREATE TABLE shift_debt_sales (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shift_id INT NOT NULL,
  customer_id INT NOT NULL,
  product_id INT NOT NULL,   -- ← Quan trọng: Link đến sản phẩm
  quantity DECIMAL(18,3),    -- ← Số lượng (lít)
  unit_price DECIMAL(18,2),  -- ← Đơn giá tại thời điểm bán
  amount DECIMAL(18,2),      -- ← Thành tiền
  notes TEXT,
  created_at TIMESTAMP
);
```

### API Response Format
```typescript
interface DebtReportItem {
  customer: {
    id: number;
    code: string;
    name: string;
    phone?: string;
    address?: string;
    creditLimit?: number;
  };
  openingBalance: number;  // Dư đầu kỳ
  totalDebit: number;      // Phát sinh nợ
  totalCredit: number;     // Phát sinh có
  closingBalance: number;  // Dư cuối kỳ
  ledgers: Array<{
    id: number;
    date: Date;
    refType: string;
    refId: number;
    debit: number;
    credit: number;
    notes?: string;
    productDetails?: {     // ← MỚI THÊM
      productName: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    };
  }>;
}
```

## Kết luận

✅ Logic tính công nợ **ĐÚNG** (đã có từ trước):
- Dư đầu kỳ = Tổng công nợ trước kỳ
- Phát sinh Nợ = Tổng bán công nợ trong kỳ
- Phát sinh Có = Tổng thu tiền trong kỳ
- Dư cuối kỳ = Dư đầu + Nợ - Có

✅ Chi tiết sản phẩm và giá **ĐÃ BỔ SUNG**:
- Hiển thị tên sản phẩm
- Hiển thị số lượng (lít)
- Hiển thị đơn giá tại thời điểm bán
- Phù hợp với nghiệp vụ xăng dầu (giá thay đổi theo tuần)

Hệ thống giờ đã hoàn chỉnh và đáp ứng đầy đủ yêu cầu nghiệp vụ!
