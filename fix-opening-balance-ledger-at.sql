-- Cập nhật ledger_at cho các bản ghi OPENING_BALANCE đã nhập trước đó
-- Set ledger_at = created_at nếu ledger_at là NULL
UPDATE debt_ledger 
SET ledger_at = created_at 
WHERE ref_type = 'OPENING_BALANCE' 
AND ledger_at IS NULL;
