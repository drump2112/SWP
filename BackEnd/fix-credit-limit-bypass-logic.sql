-- =============================================
-- SCRIPT: Chuẩn hóa logic kiểm tra bypass hạn mức công nợ
-- Mục đích: 
--   1. Tự động vô hiệu hóa bypass đã hết hạn
--   2. Tạo view để lấy hạn mức hiệu lực đúng
-- Ngày: 2026-02-05
-- =============================================

-- 1. Tự động vô hiệu hóa bypass đã hết hạn trong bảng customers
UPDATE customers
SET bypass_credit_limit = FALSE,
    bypass_until = NULL
WHERE bypass_credit_limit = TRUE
  AND bypass_until IS NOT NULL
  AND bypass_until <= NOW();

-- 2. Tự động vô hiệu hóa bypass đã hết hạn trong bảng customer_stores
UPDATE customer_stores
SET bypass_credit_limit = FALSE,
    bypass_until = NULL
WHERE bypass_credit_limit = TRUE
  AND bypass_until IS NOT NULL
  AND bypass_until <= NOW();

-- 3. Tạo function để tự động vô hiệu hóa bypass khi hết hạn
CREATE OR REPLACE FUNCTION auto_disable_expired_bypass()
RETURNS trigger AS $$
BEGIN
  -- Nếu bypass_until đã qua và bypass_credit_limit vẫn là TRUE
  IF NEW.bypass_until IS NOT NULL 
     AND NEW.bypass_until <= NOW() 
     AND NEW.bypass_credit_limit = TRUE THEN
    NEW.bypass_credit_limit := FALSE;
    NEW.bypass_until := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Tạo trigger cho bảng customers
DROP TRIGGER IF EXISTS trigger_auto_disable_customer_bypass ON customers;
CREATE TRIGGER trigger_auto_disable_customer_bypass
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION auto_disable_expired_bypass();

-- 5. Tạo trigger cho bảng customer_stores
DROP TRIGGER IF EXISTS trigger_auto_disable_store_bypass ON customer_stores;
CREATE TRIGGER trigger_auto_disable_store_bypass
  BEFORE UPDATE ON customer_stores
  FOR EACH ROW
  EXECUTE FUNCTION auto_disable_expired_bypass();

-- 6. Tạo view để lấy hạn mức hiệu lực và trạng thái bypass
CREATE OR REPLACE VIEW v_customer_effective_credit_limit AS
SELECT 
  c.id as customer_id,
  c.code as customer_code,
  c.name as customer_name,
  c.credit_limit as default_credit_limit,
  cs.store_id,
  s.name as store_name,
  -- Hạn mức hiệu lực: Ưu tiên hạn mức riêng, nếu NULL thì dùng mặc định
  COALESCE(cs.credit_limit, c.credit_limit, 0) as effective_credit_limit,
  cs.credit_limit as store_specific_limit,
  -- Trạng thái bypass (chỉ active khi bypass_until IS NULL hoặc > NOW())
  CASE 
    WHEN cs.bypass_credit_limit = TRUE 
         AND (cs.bypass_until IS NULL OR cs.bypass_until > NOW())
    THEN TRUE
    WHEN c.bypass_credit_limit = TRUE 
         AND (c.bypass_until IS NULL OR c.bypass_until > NOW())
    THEN TRUE
    ELSE FALSE
  END as is_bypassed,
  -- Level của bypass
  CASE 
    WHEN cs.bypass_credit_limit = TRUE 
         AND (cs.bypass_until IS NULL OR cs.bypass_until > NOW())
    THEN 'store'
    WHEN c.bypass_credit_limit = TRUE 
         AND (c.bypass_until IS NULL OR c.bypass_until > NOW())
    THEN 'global'
    ELSE 'none'
  END as bypass_level,
  -- Thời hạn bypass
  COALESCE(cs.bypass_until, c.bypass_until) as bypass_until,
  -- Công nợ hiện tại tại cửa hàng
  COALESCE((
    SELECT SUM(dl.debit - dl.credit)
    FROM debt_ledgers dl
    WHERE dl.customer_id = c.id
      AND dl.store_id = cs.store_id
  ), 0) as current_debt
FROM customers c
CROSS JOIN stores s
LEFT JOIN customer_stores cs ON c.id = cs.customer_id AND s.id = cs.store_id
WHERE c.is_active = TRUE;

-- 7. Tạo index để tối ưu query
CREATE INDEX IF NOT EXISTS idx_customer_stores_bypass_until 
  ON customer_stores(bypass_until) 
  WHERE bypass_credit_limit = TRUE AND bypass_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_bypass_until 
  ON customers(bypass_until) 
  WHERE bypass_credit_limit = TRUE AND bypass_until IS NOT NULL;

-- =============================================
-- HƯỚNG DẪN SỬ DỤNG VIEW:
-- =============================================

-- Lấy hạn mức hiệu lực của tất cả khách hàng tại tất cả cửa hàng:
-- SELECT * FROM v_customer_effective_credit_limit;

-- Lấy hạn mức của một khách hàng tại một cửa hàng:
-- SELECT * FROM v_customer_effective_credit_limit 
-- WHERE customer_id = 123 AND store_id = 1;

-- Tìm khách hàng vượt hạn mức:
-- SELECT * FROM v_customer_effective_credit_limit
-- WHERE current_debt > effective_credit_limit
--   AND is_bypassed = FALSE
-- ORDER BY current_debt DESC;

-- Tìm khách hàng đang được bypass:
-- SELECT * FROM v_customer_effective_credit_limit
-- WHERE is_bypassed = TRUE;

-- =============================================
-- KIỂM TRA SAU KHI CHẠY:
-- =============================================

-- Kiểm tra số lượng bypass đã bị vô hiệu hóa:
SELECT 
  'customers' as table_name,
  COUNT(*) as disabled_count
FROM customers
WHERE bypass_credit_limit = FALSE 
  AND bypass_until IS NOT NULL
  AND bypass_until <= NOW()
UNION ALL
SELECT 
  'customer_stores' as table_name,
  COUNT(*) as disabled_count
FROM customer_stores
WHERE bypass_credit_limit = FALSE 
  AND bypass_until IS NOT NULL
  AND bypass_until <= NOW();

-- Kiểm tra các bypass còn active:
SELECT 
  c.code,
  c.name,
  c.bypass_credit_limit as global_bypass,
  c.bypass_until as global_until,
  cs.store_id,
  cs.bypass_credit_limit as store_bypass,
  cs.bypass_until as store_until
FROM customers c
LEFT JOIN customer_stores cs ON c.id = cs.customer_id
WHERE (c.bypass_credit_limit = TRUE AND (c.bypass_until IS NULL OR c.bypass_until > NOW()))
   OR (cs.bypass_credit_limit = TRUE AND (cs.bypass_until IS NULL OR cs.bypass_until > NOW()));

COMMIT;
