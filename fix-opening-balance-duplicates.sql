-- ========================================================================
-- FIX OPENING BALANCE DUPLICATES - 2026-02-12
-- ========================================================================

-- 1️⃣ XEM CHI TIẾT 2 BẢN GHI TRÙNG (customer_id = 45, store_id = 5)
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
WHERE dl.customer_id = 45
AND dl.store_id = 5
AND dl.ref_type = 'OPENING_BALANCE'
ORDER BY dl.id;

-- ========================================================================

-- 2️⃣ CẬP NHẬT ledger_at = '2025-12-31' cho tất cả OPENING_BALANCE
UPDATE debt_ledger
SET ledger_at = '2025-12-31 00:00:00'::timestamp
WHERE ref_type = 'OPENING_BALANCE'
AND (ledger_at IS NULL OR ledger_at = '1970-01-01'::timestamp);

-- ========================================================================

-- 3️⃣ XÓA BẢN GHI OPENING_BALANCE TRÙNG LẶP
-- Giữ lại bản ghi cũ nhất (id nhỏ nhất), xóa bản ghi mới
DELETE FROM debt_ledger
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY customer_id, store_id
        ORDER BY created_at ASC, id ASC
      ) as rn
    FROM debt_ledger
    WHERE ref_type = 'OPENING_BALANCE'
  ) t
  WHERE rn > 1
);

-- ========================================================================

-- 4️⃣ XÁC NHẬN: Kiểm tra lại customer_id = 45
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
WHERE dl.customer_id = 45
AND dl.store_id = 5
AND dl.ref_type = 'OPENING_BALANCE'
ORDER BY dl.id;

-- ========================================================================

-- 5️⃣ KIỂM TRA: Không còn trùng lặp nào
SELECT
  customer_id,
  store_id,
  COUNT(*) as count
FROM debt_ledger
WHERE ref_type = 'OPENING_BALANCE'
GROUP BY customer_id, store_id
HAVING COUNT(*) > 1;

-- ========================================================================

-- 6️⃣ THỐNG KÊ TỔNG
SELECT
  COUNT(*) as total_opening_balance_records,
  COUNT(DISTINCT customer_id) as unique_customers,
  COUNT(DISTINCT store_id) as unique_stores,
  SUM(debit - credit)::numeric(18,2) as total_balance
FROM debt_ledger
WHERE ref_type = 'OPENING_BALANCE';
