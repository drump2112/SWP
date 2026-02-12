-- ========================================================================
-- FIX OPENING BALANCE ISSUES - 2026-02-12
-- ========================================================================

-- 1. Kiểm tra bản ghi OPENING_BALANCE trùng lặp
SELECT
  customer_id,
  store_id,
  COUNT(*) as count,
  MAX(created_at) as newest,
  MIN(created_at) as oldest
FROM debt_ledger
WHERE ref_type = 'OPENING_BALANCE'
GROUP BY customer_id, store_id
HAVING COUNT(*) > 1;

-- 2. Kiểm tra OPENING_BALANCE không có ledger_at
SELECT
  id,
  customer_id,
  store_id,
  created_at,
  ledger_at,
  debit,
  credit
FROM debt_ledger
WHERE ref_type = 'OPENING_BALANCE'
AND ledger_at IS NULL
ORDER BY customer_id, store_id;

-- ========================================================================
-- THỰC HIỆN FIX (chạy từng phần)
-- ========================================================================

-- 3️⃣ Update ledger_at = 2025-12-31 cho tất cả OPENING_BALANCE
UPDATE debt_ledger
SET ledger_at = '2025-12-31'::timestamp
WHERE ref_type = 'OPENING_BALANCE'
AND ledger_at IS NULL;

-- 4️⃣ Xóa các bản ghi OPENING_BALANCE trùng lặp (giữ lại cái cũ nhất)
DELETE FROM debt_ledger
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY customer_id, store_id ORDER BY created_at DESC) as rn
    FROM debt_ledger
    WHERE ref_type = 'OPENING_BALANCE'
  ) t
  WHERE rn > 1 -- Giữ lại rn = 1 (bản ghi cũ nhất), xóa những cái sau
);

-- ========================================================================
-- XÁC NHẬN SAU KHI FIX
-- ========================================================================

-- 5️⃣ Kiểm tra sau khi fix - không nên có trùng lặp
SELECT
  customer_id,
  store_id,
  COUNT(*) as count
FROM debt_ledger
WHERE ref_type = 'OPENING_BALANCE'
GROUP BY customer_id, store_id
ORDER BY customer_id, store_id;

-- 6️⃣ Kiểm tra khách hàng KH00042 cụ thể
SELECT
  dl.id,
  c.code as customer_code,
  c.name as customer_name,
  s.name as store_name,
  dl.debit,
  dl.credit,
  (dl.debit - dl.credit) as balance,
  dl.created_at,
  dl.ledger_at,
  dl.notes
FROM debt_ledger dl
LEFT JOIN customer c ON dl.customer_id = c.id
LEFT JOIN store s ON dl.store_id = s.id
WHERE c.code = 'KH00042'
AND dl.ref_type = 'OPENING_BALANCE'
ORDER BY dl.customer_id, dl.store_id;

-- 7️⃣ Thống kê tổng sau fix
SELECT
  COUNT(*) as total_opening_balance_records,
  COUNT(DISTINCT customer_id) as unique_customers,
  COUNT(DISTINCT store_id) as unique_stores,
  SUM(debit - credit) as total_balance
FROM debt_ledger
WHERE ref_type = 'OPENING_BALANCE';
