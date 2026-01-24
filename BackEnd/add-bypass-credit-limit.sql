-- =============================================
-- SCRIPT: Thêm cột bypass_credit_limit cho 2 bảng
-- Mục đích: Cho phép admin mở chặn hạn mức công nợ linh hoạt
-- Ngày tạo: 2026-01-24
-- =============================================

-- 1. Thêm cột vào bảng customers (bypass toàn bộ cửa hàng)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS bypass_credit_limit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bypass_until TIMESTAMP NULL;

-- 2. Thêm cột vào bảng customer_stores (bypass theo cửa hàng)
ALTER TABLE customer_stores
ADD COLUMN IF NOT EXISTS bypass_credit_limit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bypass_until TIMESTAMP NULL;

-- 3. Thêm comment để giải thích
COMMENT ON COLUMN customers.bypass_credit_limit IS 'Bỏ qua check hạn mức cho TẤT CẢ cửa hàng';
COMMENT ON COLUMN customers.bypass_until IS 'Thời hạn bypass, NULL = vô thời hạn';
COMMENT ON COLUMN customer_stores.bypass_credit_limit IS 'Bỏ qua check hạn mức cho cửa hàng cụ thể';
COMMENT ON COLUMN customer_stores.bypass_until IS 'Thời hạn bypass, NULL = vô thời hạn';

-- 4. Index để tối ưu query (optional, chỉ khi có nhiều khách hàng)
CREATE INDEX IF NOT EXISTS idx_customers_bypass ON customers(bypass_credit_limit) WHERE bypass_credit_limit = TRUE;
CREATE INDEX IF NOT EXISTS idx_customer_stores_bypass ON customer_stores(bypass_credit_limit) WHERE bypass_credit_limit = TRUE;

-- =============================================
-- HƯỚNG DẪN SỬ DỤNG:
-- =============================================
--
-- 1. BYPASS TOÀN BỘ (customers.bypass_credit_limit):
--    - Khi bật: Khách hàng được mua vượt hạn mức tại TẤT CẢ cửa hàng
--    - bypass_until: Thời điểm hết hạn bypass (NULL = vô thời hạn)
--
-- 2. BYPASS THEO CỬA HÀNG (customer_stores.bypass_credit_limit):
--    - Khi bật: Khách hàng được mua vượt hạn mức tại CỬA HÀNG CỤ THỂ
--    - bypass_until: Thời điểm hết hạn bypass (NULL = vô thời hạn)
--
-- 3. ĐỘ ƯU TIÊN:
--    - customers.bypass_credit_limit có độ ưu tiên CAO HƠN
--    - Nếu bật ở customers → áp dụng cho tất cả cửa hàng
--    - Nếu chỉ bật ở customer_stores → chỉ áp dụng cho cửa hàng đó
--
-- 4. TỰ ĐỘNG HẾT HẠN:
--    - Khi bypass_until < NOW() → bypass tự động bị bỏ qua
--    - Hệ thống sẽ tự động reset bypass_credit_limit = FALSE khi hết hạn
--
-- =============================================
-- VÍ DỤ QUERY:
-- =============================================

-- Mở chặn cho khách hàng ID=5 tại tất cả cửa hàng, trong 24 giờ:
-- UPDATE customers
-- SET bypass_credit_limit = TRUE,
--     bypass_until = NOW() + INTERVAL '24 hours'
-- WHERE id = 5;

-- Mở chặn cho khách hàng ID=5 tại cửa hàng ID=2, trong 48 giờ:
-- UPDATE customer_stores
-- SET bypass_credit_limit = TRUE,
--     bypass_until = NOW() + INTERVAL '48 hours'
-- WHERE customer_id = 5 AND store_id = 2;

-- Tắt bypass cho khách hàng ID=5:
-- UPDATE customers
-- SET bypass_credit_limit = FALSE, bypass_until = NULL
-- WHERE id = 5;

-- Xem danh sách khách hàng đang được bypass:
-- SELECT c.id, c.code, c.name, c.bypass_credit_limit, c.bypass_until
-- FROM customers c
-- WHERE c.bypass_credit_limit = TRUE
--   AND (c.bypass_until IS NULL OR c.bypass_until > NOW());
