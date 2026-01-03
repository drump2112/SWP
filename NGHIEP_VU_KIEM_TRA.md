# Kiểm Tra Nghiệp Vụ Kế Toán - Hệ Thống QLXD

## Tổng quan
Kiểm tra xem hệ thống hiện tại đã đáp ứng đầy đủ 10 yêu cầu nghiệp vụ kế toán chưa.

---

## So sánh chi tiết

| # | Yêu cầu nghiệp vụ | Trạng thái | Ghi chú |
|---|------------------|------------|---------|
| 1 | Tiền mặt bán trong ca → Phiếu thu + Sổ quỹ (111) + Doanh thu | ⚠️ **THIẾU** | Chưa có Receipt cho bán lẻ tiền mặt |
| 2 | Bán CK về TK công ty → Không phiếu thu + Ngân hàng (112) + Doanh thu | ❌ **CHƯA CÓ** | Chưa có entity ngân hàng (112) |
| 3 | Bán công nợ → Công nợ (131) + Doanh thu | ✅ **ĐÃ CÓ** | `DEBT_SALE` đã implement đầy đủ |
| 4 | Khách nợ trả mặt → Phiếu thu + Sổ quỹ (111) - Công nợ (131) | ✅ **ĐÃ CÓ** | `RECEIPT` với `DEBT_PAYMENT` |
| 5 | Khách nợ trả CK về công ty → Ngân hàng (112) - Công nợ (131) | ❌ **CHƯA CÓ** | Chưa có entity ngân hàng |
| 6 | Chi tiền mặt → Phiếu chi - Sổ quỹ (111) + Chi phí | ❌ **CHƯA CÓ** | Chưa có phiếu chi, chưa có chi phí |
| 7 | Nộp tiền về công ty → Phiếu nộp - Sổ quỹ (111) + Ngân hàng (112) | ⚠️ **THIẾU** | Có `DEPOSIT` nhưng chưa ghi ngân hàng |
| 8 | Cuối ca kiểm quỹ = 0 | ✅ **ĐÃ CÓ** | Logic tính số dư đã có |
| 9 | Cuối ca còn tồn → Chuyển sang ca sau | ✅ **ĐÃ CÓ** | Số dư quỹ được tính liên tục |
| 10 | Điều chỉnh thiếu/thừa → Phiếu điều chỉnh ± Sổ quỹ | ⚠️ **THIẾU** | Có `ADJUST` nhưng chưa có UI |

---

## Chi tiết từng trường hợp

### ✅ 1. Tiền mặt bán trong ca (THIẾU NGHIỆP VỤ)

**Yêu cầu:**
- Tạo phiếu thu (receiptType = 'CASH_SALES')
- + Sổ quỹ tiền mặt (TK 111)
- + Doanh thu
- Không công nợ

**Hiện trạng:**
```typescript
// ❌ CHƯA CÓ: Phiếu thu cho bán lẻ tiền mặt
// Hiện tại chỉ có DEBT_PAYMENT (thu nợ)
// Cần thêm CASH_SALES (bán lẻ)
```

**Cần làm:**
1. Thêm logic tạo Receipt khi chốt ca cho phần bán lẻ (tiền mặt)
2. Tính: Tổng bán = Tổng vòi bơm - Bán công nợ - Chuyển khoản
3. Tạo receipt với receiptType = 'CASH_SALES'
4. Ghi CashLedger (cashIn = số tiền bán lẻ)

---

### ❌ 2. Bán trong ca - CK về TK công ty (CHƯA CÓ)

**Yêu cầu:**
- Không tạo phiếu thu cửa hàng
- Không sổ quỹ
- + Ngân hàng công ty (TK 112)
- + Doanh thu

**Hiện trạng:**
```typescript
// ❌ CHƯA CÓ: Entity BankAccount
// ❌ CHƯA CÓ: BankLedger (sổ ngân hàng)
// ❌ CHƯA CÓ: Field paymentMethod trong Sale
```

**Cần làm:**
1. Tạo entity `BankAccount` (TK 112)
2. Tạo entity `BankLedger` (sổ phát sinh ngân hàng)
3. Thêm field `paymentMethod` vào Sale ('CASH', 'BANK_TRANSFER', 'DEBT')
4. Logic ghi nhận khi paymentMethod = 'BANK_TRANSFER'

---

### ✅ 3. Bán công nợ (ĐÃ CÓ)

**Yêu cầu:**
- Không phiếu thu
- Không sổ quỹ
- + Công nợ khách hàng (TK 131)
- + Doanh thu

**Hiện trạng:**
```typescript
// ✅ ĐÃ CÓ
// File: shifts.service.ts, line 218-253
await manager.save(DebtLedger, {
  customerId: debtSale.customerId,
  storeId: shift.storeId,
  refType: 'DEBT_SALE',
  refId: debtSaleRecord.id,
  debit: totalAmount, // Tăng công nợ
  credit: 0,
  notes: debtSale.notes || 'Bán công nợ',
});
```

**Kết luận:** ✅ Đúng yêu cầu

---

### ✅ 4. Khách nợ trả mặt tại cửa hàng (ĐÃ CÓ)

**Yêu cầu:**
- Tạo phiếu thu
- + Sổ quỹ tiền mặt (TK 111)
- − Công nợ khách hàng (TK 131)
- Không doanh thu

**Hiện trạng:**
```typescript
// ✅ ĐÃ CÓ
// File: shifts.service.ts, line 263-301

// 1. Tạo Receipt
const receiptRecord = await manager.save(Receipt, {
  receiptType: receipt.receiptType, // DEBT_PAYMENT
  amount: receipt.amount,
});

// 2. Giảm công nợ
await manager.save(DebtLedger, {
  refType: 'RECEIPT',
  debit: 0,
  credit: detail.amount, // Giảm nợ
});

// 3. Tăng sổ quỹ
await manager.save(CashLedger, {
  cashIn: receipt.amount, // Thu tiền
  cashOut: 0,
});
```

**Kết luận:** ✅ Đúng yêu cầu

---

### ❌ 5. Khách nợ trả CK về công ty (CHƯA CÓ)

**Yêu cầu:**
- Không phiếu thu cửa hàng
- Không sổ quỹ
- + Ngân hàng (TK 112)
- − Công nợ khách hàng (TK 131)

**Hiện trạng:**
```typescript
// ❌ CHƯA CÓ: Không có entity BankLedger
// ❌ CHƯA CÓ: Không có logic ghi nhận CK thanh toán nợ
```

**Cần làm:**
1. Tạo entity `BankLedger`
2. Thêm receiptType = 'BANK_TRANSFER_DEBT_PAYMENT'
3. Logic: Ghi BankLedger (tăng) + DebtLedger (giảm)
4. KHÔNG ghi CashLedger

---

### ❌ 6. Chi tiền mặt trong ca (CHƯA CÓ)

**Yêu cầu:**
- Tạo phiếu chi
- − Sổ quỹ tiền mặt (TK 111)
- + Chi phí (TK 642, 641...)

**Hiện trạng:**
```typescript
// ❌ CHƯA CÓ: Entity Expense (phiếu chi)
// ❌ CHƯA CÓ: Entity ExpenseCategory (loại chi phí)
// ❌ CHƯA CÓ: Logic chi tiền trong ca
```

**Cần làm:**
1. Tạo entity `Expense` (phiếu chi)
2. Tạo entity `ExpenseCategory` (danh mục chi phí)
3. Ghi CashLedger (cashOut)
4. Thêm vào CloseShiftDto

---

### ⚠️ 7. Nộp tiền về công ty (THIẾU NGÂN HÀNG)

**Yêu cầu:**
- Tạo phiếu chi (phiếu nộp tiền)
- − Sổ quỹ tiền mặt (TK 111)
- + Ngân hàng công ty (TK 112)

**Hiện trạng:**
```typescript
// ⚠️ THIẾU: Có Deposit và CashLedger nhưng THIẾU BankLedger
// File: shifts.service.ts, line 303-320

// ✅ Đã có: Giảm sổ quỹ
await manager.save(CashLedger, {
  refType: 'DEPOSIT',
  cashIn: 0,
  cashOut: deposit.amount, // Chi tiền
});

// ❌ THIẾU: Tăng ngân hàng
// await manager.save(BankLedger, {
//   bankIn: deposit.amount,
// });
```

**Cần làm:**
1. Tạo entity `BankLedger`
2. Ghi nhận tăng ngân hàng khi nộp tiền

---

### ✅ 8. Cuối ca kiểm quỹ = 0 (ĐÃ CÓ)

**Yêu cầu:**
- Không phát sinh phiếu
- Sổ quỹ = tổng thu − tổng chi = 0

**Hiện trạng:**
```typescript
// ✅ ĐÃ CÓ
// Logic tính số dư tự động trong reports.service.ts
const openingBalance = Number(openingBalanceResult?.balance || 0);
const closingBalance = openingBalance + totalCashIn - totalCashOut;
```

**Kết luận:** ✅ Đúng yêu cầu

---

### ✅ 9. Cuối ca còn tồn tiền mặt (ĐÃ CÓ)

**Yêu cầu:**
- Không phát sinh phiếu
- Sổ quỹ còn tồn chuyển sang ca sau

**Hiện trạng:**
```typescript
// ✅ ĐÃ CÓ
// Số dư quỹ được tính liên tục từ ca trước
// File: reports.service.ts
const openingBalance = fromDate
  ? await this.getCustomerBalance(...)
  : 0;
```

**Kết luận:** ✅ Đúng yêu cầu

---

### ⚠️ 10. Điều chỉnh thiếu/thừa tiền ca (THIẾU UI)

**Yêu cầu:**
- Tạo phiếu thu hoặc phiếu chi điều chỉnh
- + / − Sổ quỹ tiền mặt (TK 111)
- Hạch toán vào TK chênh lệch/chi phí khác

**Hiện trạng:**
```typescript
// ⚠️ THIẾU: Entity đã có refType = 'ADJUST'
// ❌ THIẾU: UI để tạo phiếu điều chỉnh
// ❌ THIẾU: Logic tính chênh lệch tự động
```

**Cần làm:**
1. Thêm UI điều chỉnh trong ShiftOperations
2. Tự động so sánh: Số thực tế vs Số lý thuyết
3. Tạo CashLedger với refType = 'ADJUST'

---

## Tổng kết

### ✅ ĐÃ CÓ (4/10 = 40%)
- ✅ #3: Bán công nợ
- ✅ #4: Khách nợ trả mặt
- ✅ #8: Kiểm quỹ = 0
- ✅ #9: Tồn tiền chuyển ca

### ⚠️ THIẾU MỘT PHẦN (3/10 = 30%)
- ⚠️ #1: Tiền mặt bán trong ca (thiếu phiếu thu bán lẻ)
- ⚠️ #7: Nộp tiền về công ty (thiếu ghi ngân hàng)
- ⚠️ #10: Điều chỉnh (thiếu UI)

### ❌ CHƯA CÓ (3/10 = 30%)
- ❌ #2: Bán CK về công ty
- ❌ #5: Khách nợ trả CK
- ❌ #6: Chi tiền mặt trong ca

---

## Các Entity cần bổ sung

### 1. BankAccount (Tài khoản ngân hàng)
```typescript
@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  accountNumber: string; // Số TK

  @Column()
  bankName: string; // Tên ngân hàng

  @Column()
  accountName: string; // Tên chủ TK

  @Column({ default: true })
  isCompanyAccount: boolean; // TK công ty hay cửa hàng
}
```

### 2. BankLedger (Sổ ngân hàng - TK 112)
```typescript
@Entity('bank_ledger')
export class BankLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bankAccountId: number;

  @Column()
  refType: string; // DEPOSIT, BANK_TRANSFER_SALE, BANK_TRANSFER_DEBT

  @Column()
  refId: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  bankIn: number; // Tiền vào (Nợ TK 112)

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  bankOut: number; // Tiền ra (Có TK 112)

  @CreateDateColumn()
  createdAt: Date;
}
```

### 3. Expense (Phiếu chi)
```typescript
@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  storeId: number;

  @Column()
  shiftId: number;

  @Column()
  expenseCategoryId: number; // Loại chi phí

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### 4. ExpenseCategory (Danh mục chi phí)
```typescript
@Entity('expense_categories')
export class ExpenseCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  code: string; // 642, 641, 627...

  @Column()
  name: string; // Chi phí quản lý, Chi phí bán hàng...
}
```

---

## Các thay đổi cần thực hiện

### A. Cấp độ cao (High Priority)

#### 1. Thêm paymentMethod vào Sale
```typescript
// File: sale.entity.ts
@Column({ default: 'CASH' })
paymentMethod: string; // 'CASH', 'BANK_TRANSFER', 'DEBT'
```

#### 2. Tạo Receipt cho bán lẻ tiền mặt
```typescript
// File: shifts.service.ts - closeShift()
// Sau khi xử lý pump readings:

const totalSales = /* tổng từ vòi bơm */;
const debtSales = /* tổng bán công nợ */;
const bankTransferSales = /* tổng CK */;
const cashSales = totalSales - debtSales - bankTransferSales;

if (cashSales > 0) {
  // Tạo Receipt cho bán lẻ
  const receipt = await manager.save(Receipt, {
    storeId: shift.storeId,
    shiftId: shift.id,
    receiptType: 'CASH_SALES',
    amount: cashSales,
  });

  // Ghi sổ quỹ
  await manager.save(CashLedger, {
    storeId: shift.storeId,
    refType: 'RECEIPT',
    refId: receipt.id,
    cashIn: cashSales,
    cashOut: 0,
  });
}
```

### B. Cấp độ trung bình (Medium Priority)

#### 3. Thêm entity BankLedger
- Tạo migration
- Thêm vào module
- Cập nhật logic nộp tiền

#### 4. Thêm UI điều chỉnh quỹ
- Form nhập số thực tế
- So sánh với số lý thuyết
- Tạo phiếu điều chỉnh

### C. Cấp độ thấp (Low Priority)

#### 5. Thêm entity Expense
- Phiếu chi tiền mặt
- Danh mục chi phí

#### 6. Bổ sung logic CK thanh toán nợ
- Thêm loại receipt mới
- Ghi BankLedger thay vì CashLedger

---

## Kết luận

**Tình trạng:** 🟡 **Đạt 40% yêu cầu nghiệp vụ**

**Ưu điểm:**
- ✅ Nghiệp vụ công nợ đã hoàn thiện
- ✅ Sổ quỹ tiền mặt cơ bản đã có
- ✅ Phiếu thu/nộp đã implement

**Thiếu sót chính:**
- ❌ Chưa có sổ ngân hàng (TK 112)
- ❌ Chưa phân biệt phương thức thanh toán (tiền mặt/CK)
- ❌ Chưa có phiếu chi/chi phí
- ⚠️ Thiếu phiếu thu cho bán lẻ tiền mặt

**Khuyến nghị:**
1. **Ưu tiên cao:** Bổ sung BankLedger và paymentMethod
2. **Ưu tiên trung:** Hoàn thiện phiếu thu bán lẻ và điều chỉnh quỹ
3. **Ưu tiên thấp:** Thêm quản lý chi phí

Hệ thống hiện tại phù hợp cho **nghiệp vụ cơ bản** nhưng cần bổ sung để **đầy đủ theo chuẩn kế toán**.
