# 🔧 FIX: Vấn Đề Ghi Nợ Sai Cho Bán Lẻ

## 📋 Tóm Tắt Vấn Đề

### ❌ Trước Khi Fix
1. **Frontend** tạo `retailDebtSales` từ `declaredRetailQuantities`
2. Ghi **công nợ (debt)** cho "khách hàng đại diện" (retailCustomerId)
3. Khách hàng đại diện bị **phát sinh nợ** = Tổng tiền bán lẻ
4. **SAI LOGIC** vì bán lẻ = thu tiền mặt ngay, KHÔNG phải công nợ!

### ✅ Sau Khi Fix
1. **Xóa** logic tạo `retailDebtSales`
2. Bán lẻ chỉ ghi vào `cash_ledger` (cashIn) - đã đúng ở Backend
3. Field `retailCustomerId` giữ lại nhưng **chỉ để theo dõi**, không ghi nợ
4. Công nợ chỉ dành cho **bán công nợ thực sự** (khách hàng lấy hàng trước, trả tiền sau)

---

## 🎯 Nguyên Lý Đúng

### Công Thức Sổ Quỹ
```
Tồn cuối = Tồn đầu + Thu (cashIn) - Chi (cashOut)
```

### Phân Loại Giao Dịch

| Loại | Cash Ledger | Debt Ledger | Ghi Chú |
|------|-------------|-------------|---------|
| **Bán lẻ** | `cashIn` ✅ | KHÔNG ❌ | Thu tiền mặt ngay |
| **Bán công nợ** | KHÔNG ❌ | `debit` ✅ | Phát sinh nợ khách |
| **Thu nợ** | `cashIn` ✅ | `credit` ✅ | Thu tiền + giảm nợ |
| **Nộp tiền** | `cashOut` ✅ | KHÔNG ❌ | Nộp về công ty |
| **Chi phí** | `cashOut` ✅ | KHÔNG ❌ | Chi tiền mặt |

---

## 📝 Chi Tiết Thay Đổi

### 1. Frontend: ShiftOperationsPage.tsx

#### ✅ Xóa logic tạo retailDebtSales
**Trước:**
```tsx
// Generate Debt Sales from Retail Quantities
const retailDebtSales = [];
if (retailCustomerId) {
  for (const [productIdStr, quantity] of Object.entries(declaredRetailQuantities)) {
    retailDebtSales.push({
      customerId: retailCustomerId,  // ❌ Ghi nợ cho nhân viên
      notes: 'Bán lẻ (Ghi nợ người phụ trách)',
    });
  }
}

debtSales: [...draftDebtSales, ...retailDebtSales]  // ❌
```

**Sau:**
```tsx
// ✅ Bán lẻ KHÔNG tạo debt sales
// Backend đã ghi vào cash_ledger (bước 5 trong closeShift)
debtSales: draftDebtSales.map(ds => ({ ... }))  // ✅ Chỉ debt thực sự
```

#### ✅ Xóa validation bắt buộc chọn retailCustomerId
**Trước:**
```tsx
if (hasRetailSales && !retailCustomerId) {
  toast.error('Vui lòng chọn người chịu trách nhiệm!');
  return;
}
```

**Sau:**
```tsx
// ✅ Không cần chọn retailCustomerId nữa
// Chỉ để theo dõi, không ảnh hưởng logic
```

#### ✅ Cập nhật UI messages
**Trước:**
```tsx
<h3>👤 Người chịu trách nhiệm doanh thu bán lẻ</h3>
<p>Lượng bán lẻ sẽ được ghi nhận là công nợ của người này.</p>
```

**Sau:**
```tsx
<h3>👤 Người phụ trách ca (tùy chọn)</h3>
<p>ℹ️ Chọn nhân viên phụ trách ca này (chỉ để theo dõi).
   Bán lẻ = Thu tiền mặt ngay, KHÔNG ghi công nợ.</p>
```

### 2. Backend: shifts.service.ts

#### ✅ Cập nhật comments cho rõ ràng

**Bước 2: Tạo sales (bán lẻ)**
```typescript
// ✅ Tạo sales từ pump readings - ĐÂY LÀ BÁN LẺ
// Bán lẻ = Thu tiền mặt ngay, KHÔNG ghi công nợ
const salesData = pumpReadingsData.map(reading => ({
  customerId: undefined,  // ✅ NULL = Bán lẻ
}));
```

**Bước 5: Ghi sổ quỹ (QUAN TRỌNG!)**
```typescript
// ✅ GHI SỔ QUỸ: Thu tiền bán lẻ
// Bán lẻ = Thu tiền mặt ngay → Ghi cashIn vào cash_ledger
// KHÔNG ghi debt_ledger vì không phải công nợ
await manager.save(CashLedger, {
  cashIn: totalRetailAmount,  // ✅ Thu tiền vào quỹ
  cashOut: 0,
});
```

**Bước 6.1: Xử lý debt sales**
```typescript
// ✅ Xử lý Debt Sales (bán công nợ - KHÁC VỚI BÁN LẺ!)
// Frontend chỉ gửi debt sales cho khách hàng thực sự mua nợ
// KHÔNG bao gồm bán lẻ (đã xử lý ở bước 5)

// ✅ Ghi công nợ (debit customer - PHÁT SINH NỢ)
// Chỉ dành cho bán công nợ, KHÔNG dùng cho bán lẻ
await manager.save(DebtLedger, {
  debit: totalAmount,
});
```

**Bước 6.3: Xử lý nộp tiền**
```typescript
// ✅ Xử lý Deposits (nộp tiền về công ty)
// Tiền rời khỏi quỹ cửa hàng → cashOut
// KHÔNG liên quan đến công nợ khách hàng

// ✅ Ghi sổ quỹ: Tiền RA (nộp về công ty)
// Công thức: Tồn cuối = Tồn đầu + Thu (cashIn) - Nộp (cashOut)
await manager.save(CashLedger, {
  cashIn: 0,
  cashOut: deposit.amount,  // ✅ Tiền ra khỏi quỹ
});
```

---

## 🧪 Test Cases

### Test 1: Bán lẻ thuần túy
```
Input:
- Pump reading: 100 lít @ 20,000 VNĐ = 2,000,000 VNĐ
- Debt sales: 0
- Receipts: 0
- Deposits: 0

Expected:
✅ cash_ledger: cashIn = 2,000,000
❌ debt_ledger: KHÔNG có record nào
✅ Tồn quỹ: +2,000,000
```

### Test 2: Bán lẻ + Bán nợ + Nộp tiền
```
Input:
- Pump reading: 100 lít @ 20,000 = 2,000,000 VNĐ
- Debt sales: 50 lít @ 20,000 = 1,000,000 VNĐ (Khách A)
- Bán lẻ: 50 lít = 1,000,000 VNĐ
- Deposits: 800,000 VNĐ

Expected:
✅ cash_ledger (bán lẻ): cashIn = 1,000,000
✅ cash_ledger (nộp tiền): cashOut = 800,000
✅ debt_ledger (Khách A): debit = 1,000,000
✅ Tồn quỹ: +1,000,000 - 800,000 = +200,000
✅ Nợ Khách A: +1,000,000
```

### Test 3: Thu nợ + Nộp tiền
```
Input:
- Receipts: 500,000 VNĐ (Thu nợ Khách A)
- Deposits: 500,000 VNĐ (Nộp về công ty)

Expected:
✅ cash_ledger (thu nợ): cashIn = 500,000
✅ cash_ledger (nộp tiền): cashOut = 500,000
✅ debt_ledger (Khách A): credit = 500,000 (giảm nợ)
✅ Tồn quỹ: +500,000 - 500,000 = 0
✅ Nợ Khách A: -500,000
```

---

## ✅ Kết Quả

### Đã Fix
- [x] Xóa logic tạo debt sales từ bán lẻ
- [x] Xóa validation bắt buộc retailCustomerId
- [x] Cập nhật UI messages rõ ràng
- [x] Thêm comments giải thích logic
- [x] Đảm bảo bán lẻ chỉ ghi cash_ledger
- [x] Đảm bảo nộp tiền chỉ ghi cash_ledger (cashOut)

### Logic Đúng
✅ **Bán lẻ** = Thu tiền mặt → `cashIn`
✅ **Bán công nợ** = Phát sinh nợ → `debit` (debt_ledger)
✅ **Thu nợ** = Thu tiền + Giảm nợ → `cashIn` + `credit`
✅ **Nộp tiền** = Tiền ra khỏi quỹ → `cashOut`
✅ **Chi phí** = Tiền ra khỏi quỹ → `cashOut`

### Không Còn Vấn Đề
❌ Khách hàng đại diện không còn bị ghi nợ sai
❌ Báo cáo công nợ không còn hiển thị bán lẻ
❌ Sổ quỹ vẫn đúng (backend đã đúng từ đầu)

---

## 📚 Tham Khảo

### Files Đã Sửa
1. `/FrontEnd/src/pages/ShiftOperationsPage.tsx` (Lines 488-495, 1495-1520)
2. `/BackEnd/src/shifts/shifts.service.ts` (Lines 172-370, comments)

### Nguyên Lý Kế Toán
- **Sổ quỹ (Cash Ledger)**: Theo dõi tiền mặt thực tế
- **Sổ công nợ (Debt Ledger)**: Theo dõi tiền nợ (chưa thu)
- **Bán lẻ ≠ Công nợ**: Bán lẻ thu tiền ngay, không phải nợ

### Logic Đúng
```
Bán lẻ:     Hàng ra → Tiền vào (cash) → GHI cash_ledger
Bán công nợ: Hàng ra → Phát sinh nợ   → GHI debt_ledger
Thu nợ:      Tiền vào + Giảm nợ       → GHI cash + debt
Nộp tiền:    Tiền ra                   → GHI cash_ledger
```

---

**Người fix:** GitHub Copilot
**Ngày fix:** 6/1/2026
**Status:** ✅ HOÀN THÀNH
