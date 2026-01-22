-- Migration: Add receipt_at and notes columns to receipts table
-- Date: 2026-01-22
-- Description: Thêm cột thời gian thu tiền và ghi chú cho phiếu thu

-- Thêm cột receipt_at (thời gian thu tiền do người dùng chọn)
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS receipt_at TIMESTAMP;

-- Thêm cột notes cho phiếu thu (nếu chưa có)
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS notes TEXT;

-- Cập nhật các phiếu thu cũ: sử dụng created_at để điền vào receipt_at
UPDATE receipts
SET receipt_at = created_at
WHERE receipt_at IS NULL;

-- Thêm comment cho các cột mới
COMMENT ON COLUMN receipts.receipt_at IS 'Thời gian thu tiền do người dùng chọn';
COMMENT ON COLUMN receipts.notes IS 'Ghi chú phiếu thu';

-- ============================================================
-- Migration: Add doc_at column to inventory_documents table
-- Description: Thêm cột thời gian nhập hàng do người dùng chọn
-- ============================================================

-- Thêm cột doc_at (thời gian nhập hàng do người dùng chọn)
ALTER TABLE inventory_documents ADD COLUMN IF NOT EXISTS doc_at TIMESTAMP;

-- Cập nhật các phiếu nhập cũ: sử dụng doc_date để điền vào doc_at
UPDATE inventory_documents
SET doc_at = doc_date::timestamp
WHERE doc_at IS NULL AND doc_date IS NOT NULL;

-- Thêm comment cho cột mới
COMMENT ON COLUMN inventory_documents.doc_at IS 'Thời gian nhập hàng do người dùng chọn';

-- ============================================================
-- Migration: Add deposit_at column to cash_deposits table
-- Description: Thêm cột thời gian nộp tiền do người dùng chọn
-- ============================================================

-- Thêm cột deposit_at (thời gian nộp tiền do người dùng chọn)
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS deposit_at TIMESTAMP;

-- Cập nhật các phiếu nộp cũ: sử dụng deposit_date + deposit_time để điền vào deposit_at
UPDATE cash_deposits
SET deposit_at = (deposit_date::date + COALESCE(deposit_time, '00:00:00')::time)::timestamp
WHERE deposit_at IS NULL AND deposit_date IS NOT NULL;

-- Bỏ constraint NOT NULL cho deposit_date và deposit_time vì đã dùng deposit_at
ALTER TABLE cash_deposits ALTER COLUMN deposit_date DROP NOT NULL;
ALTER TABLE cash_deposits ALTER COLUMN deposit_time DROP NOT NULL;

  -- Thêm comment cho cột mới
COMMENT ON COLUMN cash_deposits.deposit_at IS 'Thời gian nộp tiền do người dùng chọn';

-- ============================================================
-- Migration: Add created_at column to shifts table
-- Description: Thêm cột thời gian tạo ca để kiểm soát/logging
-- ============================================================

-- Thêm cột created_at cho shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Cập nhật các ca cũ: sử dụng opened_at để điền vào created_at
UPDATE shifts
SET created_at = COALESCE(opened_at, NOW())
WHERE created_at IS NULL;

-- Thêm comment cho cột mới
COMMENT ON COLUMN shifts.created_at IS 'Thời gian tạo ca để kiểm soát/logging';

-- ============================================================
-- Migration: Add ledger_at column to cash_ledger table
-- Description: Thêm cột thời gian giao dịch do người dùng chọn
-- ============================================================

-- Thêm cột ledger_at (thời gian giao dịch do người dùng chọn)
ALTER TABLE cash_ledger ADD COLUMN IF NOT EXISTS ledger_at TIMESTAMP;

-- Cập nhật các bản ghi cũ: sử dụng created_at để điền vào ledger_at
UPDATE cash_ledger
SET ledger_at = created_at
WHERE ledger_at IS NULL;

-- Thêm comment cho cột mới
COMMENT ON COLUMN cash_ledger.ledger_at IS 'Thời gian giao dịch do người dùng chọn (theo closedAt của ca)';

-- ============================================================
-- Migration: Add ledger_at column to debt_ledger table
-- Description: Thêm cột thời gian giao dịch do người dùng chọn
-- ============================================================

-- Thêm cột ledger_at (thời gian giao dịch do người dùng chọn)
ALTER TABLE debt_ledger ADD COLUMN IF NOT EXISTS ledger_at TIMESTAMP;

-- Cập nhật các bản ghi cũ: sử dụng created_at để điền vào ledger_at
UPDATE debt_ledger
SET ledger_at = created_at
WHERE ledger_at IS NULL;

-- Thêm comment cho cột mới
COMMENT ON COLUMN debt_ledger.ledger_at IS 'Thời gian giao dịch do người dùng chọn (theo closedAt của ca)';