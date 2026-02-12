-- ========================================================================
-- KIỂM TRA DỮ LIỆU OPENING BALANCE - TÌM NGUYÊN NHÂN THỰC
-- ========================================================================

-- 1️⃣ Xem tất cả OPENING_BALANCE, nhóm theo ledger_at
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

-- 2️⃣ Kiểm tra khách KH00044 chi tiết
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
WHERE c.code = 'KH00044'
AND dl.ref_type = 'OPENING_BALANCE'
ORDER BY dl.id;

-- ========================================================================

-- 3️⃣ So sánh: Khách nào có ledger_at NULL
SELECT
  c.code as customer_code,
  c.name as customer_name,
  COUNT(*) as opening_balance_count,
  COUNT(CASE WHEN dl.ledger_at IS NULL THEN 1 END) as ledger_at_null_count,
  COUNT(CASE WHEN dl.ledger_at = '2025-12-31'::date THEN 1 END) as ledger_at_correct_count
FROM debt_ledger dl
LEFT JOIN customer c ON dl.customer_id = c.id
WHERE dl.ref_type = 'OPENING_BALANCE'
GROUP BY c.id, c.code, c.name
HAVING COUNT(CASE WHEN dl.ledger_at IS NULL THEN 1 END) > 0
ORDER BY c.code;

-- ========================================================================

-- 4️⃣ Thống kê: Bao nhiêu khách bị ảnh hưởng
SELECT
  COUNT(DISTINCT CASE WHEN ledger_at IS NULL THEN customer_id END) as customers_with_null_ledger_at,
  COUNT(DISTINCT CASE WHEN ledger_at IS NOT NULL THEN customer_id END) as customers_with_ledger_at,
  COUNT(DISTINCT CASE WHEN ledger_at = '2025-12-31'::date THEN customer_id END) as customers_with_correct_date
FROM debt_ledger
WHERE ref_type = 'OPENING_BALANCE';
