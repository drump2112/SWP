-- ========================================================================
-- FIX OPENING BALANCE - SAI NGÀY NHẬP
-- ========================================================================

-- 1️⃣ FIX DAY = 2026-12-31 → 2025-12-31
UPDATE debt_ledger
SET ledger_at = '2025-12-31'::timestamp
WHERE ref_type = 'OPENING_BALANCE'
AND ledger_at::date = '2026-12-31'::date;

-- ========================================================================

-- 2️⃣ FIX BUG: Ngày = 0025-12-31 (năm 25 AD) → 2025-12-31
UPDATE debt_ledger
SET ledger_at = '2025-12-31'::timestamp
WHERE ref_type = 'OPENING_BALANCE'
AND EXTRACT(YEAR FROM ledger_at) < 1000;

-- ========================================================================

-- 3️⃣ KIỂM TRA SAU KHI FIX
SELECT
  CASE
    WHEN ledger_at IS NULL THEN '❌ NULL'
    WHEN ledger_at::date = '2025-12-31' THEN '✅ 31/12/2025'
    ELSE '⚠️ Ngày khác: ' || ledger_at::date
  END as status,
  COUNT(*) as count,
  SUM(debit - credit) as total_balance
FROM debt_ledger
WHERE ref_type = 'OPENING_BALANCE'
GROUP BY ledger_at
ORDER BY ledger_at;

-- ========================================================================

-- 4️⃣ KIỂM TRA KH00044
SELECT
  dl.id,
  c.code as customer_code,
  c.name as customer_name,
  s.name as store_name,
  dl.debit,
  dl.credit,
  (dl.debit - dl.credit) as balance,
  dl.ledger_at
FROM debt_ledger dl
LEFT JOIN customer c ON dl.customer_id = c.id
LEFT JOIN store s ON dl.store_id = s.id
WHERE c.code = 'KH00044'
AND dl.ref_type = 'OPENING_BALANCE';

-- ========================================================================

-- 5️⃣ THỐNG KÊ CUỐI CÙNG
SELECT
  COUNT(*) as total_opening_balance,
  COUNT(DISTINCT customer_id) as unique_customers,
  COUNT(DISTINCT CASE WHEN ledger_at::date = '2025-12-31' THEN customer_id END) as customers_correct_date,
  SUM(debit - credit)::numeric(18,2) as total_balance
FROM debt_ledger
WHERE ref_type = 'OPENING_BALANCE';
