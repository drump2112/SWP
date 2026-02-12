-- ========================================================================
-- KIỂM TRA TRẠNG THÁI SAU KHI FIX - SQL DATABASE
-- ========================================================================

-- 1️⃣ KIỂM TRA: Đã fix được chưa
-- Nếu chỉ còn 1 dòng với "✅ 31/12/2025" = ✅ FIX THÀNH CÔNG
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

-- 2️⃣ KIỂM TRA KH00044 CỤ THỂ
-- Phải hiển thị: ledger_at = 2025-12-31 07:00:00 (hoặc 2025-12-31 00:00:00)
SELECT
  dl.id,
  c.code as customer_code,
  c.name as customer_name,
  s.name as store_name,
  dl.debit,
  dl.credit,
  (dl.debit - dl.credit) as balance,
  dl.ledger_at,
  CASE
    WHEN dl.ledger_at::date = '2025-12-31' THEN '✅ ĐÚNG'
    WHEN dl.ledger_at::date = '2026-12-31' THEN '❌ SAI - Vẫn là 2026'
    ELSE '❌ SAI - Ngày khác'
  END as status
FROM debt_ledger dl
LEFT JOIN customer c ON dl.customer_id = c.id
LEFT JOIN store s ON dl.store_id = s.id
WHERE c.code = 'KH00044'
AND dl.ref_type = 'OPENING_BALANCE';

-- ========================================================================

-- 3️⃣ THỐNG KÊ TỔNG
-- Kiểm tra có bao nhiêu khách bị ảnh hưởng
SELECT
  COUNT(CASE WHEN ledger_at::date = '2025-12-31' THEN 1 END) as correct_count,
  COUNT(CASE WHEN ledger_at::date != '2025-12-31' THEN 1 END) as incorrect_count,
  COUNT(*) as total
FROM debt_ledger
WHERE ref_type = 'OPENING_BALANCE';

-- ========================================================================

-- 4️⃣ KIỂM TRA CHI TIẾT: Có phần tử nào vẫn sai
-- Nếu không trả về kết quả = ✅ TẤT CẢ ĐÃ ĐÚNG
SELECT
  c.code as customer_code,
  c.name as customer_name,
  s.name as store_name,
  dl.ledger_at,
  (dl.debit - dl.credit) as balance,
  '❌ VẪN SAI' as note
FROM debt_ledger dl
LEFT JOIN customer c ON dl.customer_id = c.id
LEFT JOIN store s ON dl.store_id = s.id
WHERE dl.ref_type = 'OPENING_BALANCE'
AND dl.ledger_at::date != '2025-12-31'
ORDER BY c.code;
