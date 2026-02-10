-- Script: Thêm cột ref_type vào bảng cash_deposits
-- Mục đích: Phân biệt phiếu nộp tiền bán lẻ (RETAIL) vs phiếu nộp tiền từ phiếu thu nợ (RECEIPT)

-- Thêm cột nếu chưa tồn tại
ALTER TABLE cash_deposits
ADD COLUMN IF NOT EXISTS ref_type VARCHAR(50) DEFAULT NULL;

-- COMMENT cho column (PostgreSQL)
COMMENT ON COLUMN cash_deposits.ref_type IS 'RETAIL = nộp tiền bán lẻ, RECEIPT = nộp tiền từ phiếu thu nợ';

-- Update giá trị mặc định cho các bản ghi cũ
UPDATE cash_deposits
SET ref_type = 'RETAIL'
WHERE ref_type IS NULL;

-- Xem kết quả
SELECT id, amount, payment_method, ref_type, notes
FROM cash_deposits
ORDER BY deposit_at DESC
LIMIT 10;
