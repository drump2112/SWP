-- =============================================================================
-- DEBUG: Tìm phiếu thu có trong debt_ledger nhưng KHÔNG có trong receipts
-- =============================================================================
-- Vấn đề: Tab "Thu nợ" trong ca bị trống vì query từ bảng receipts
-- Nguyên nhân: Dữ liệu cũ có debt_ledger nhưng không có receipts

-- =============================================================================
-- BƯỚC 1: So sánh debt_ledger vs receipts
-- =============================================================================

-- 1.1. Tìm các bản ghi debt_ledger (ref_type='RECEIPT') KHÔNG có trong receipts
SELECT
    'Có trong debt_ledger nhưng KHÔNG có trong receipts' AS van_de,
    dl.id AS debt_ledger_id,
    dl.shift_id,
    s.name AS ca,
    s.closed_at,
    dl.ref_id AS receipt_id_expected,
    c.code AS customer_code,
    c.name AS customer_name,
    dl.credit AS so_tien_thu,
    dl.ledger_at,
    dl.notes
FROM debt_ledger dl
INNER JOIN shifts s ON s.id = dl.shift_id
INNER JOIN customers c ON c.id = dl.customer_id
WHERE dl.ref_type = 'RECEIPT'
  AND s.status = 'CLOSED'
  AND c.type != 'INTERNAL'  -- Chỉ xem khách hàng thường (không phải cửa hàng)
  AND NOT EXISTS (
    SELECT 1 FROM receipts r
    WHERE r.id = dl.ref_id
  )
ORDER BY dl.shift_id, dl.ledger_at
LIMIT 50;

-- 1.2. Tìm các bản ghi cash_ledger (ref_type='RECEIPT') KHÔNG có trong receipts
SELECT
    'Có trong cash_ledger nhưng KHÔNG có trong receipts' AS van_de,
    cl.id AS cash_ledger_id,
    cl.shift_id,
    s.name AS ca,
    s.closed_at,
    cl.ref_id AS receipt_id_expected,
    cl.cash_in AS so_tien_thu,
    cl.ledger_at,
    cl.notes
FROM cash_ledger cl
INNER JOIN shifts s ON s.id = cl.shift_id
WHERE cl.ref_type = 'RECEIPT'
  AND s.status = 'CLOSED'
  AND NOT EXISTS (
    SELECT 1 FROM receipts r
    WHERE r.id = cl.ref_id
  )
ORDER BY cl.shift_id, cl.ledger_at
LIMIT 50;

-- 1.3. Đếm số lượng theo ca
SELECT
    s.id AS shift_id,
    s.name AS ca,
    st.name AS cua_hang,
    s.closed_at,
    COUNT(DISTINCT dl.id) AS so_debt_ledger_receipt,
    COUNT(DISTINCT r.id) AS so_receipts_table
FROM shifts s
INNER JOIN stores st ON st.id = s.store_id
LEFT JOIN debt_ledger dl ON dl.shift_id = s.id AND dl.ref_type = 'RECEIPT'
LEFT JOIN receipts r ON r.shift_id = s.id
WHERE s.status = 'CLOSED'
  AND s.closed_at >= NOW() - INTERVAL '90 days'  -- Chỉ xem 90 ngày gần nhất
GROUP BY s.id, s.name, st.name, s.closed_at
HAVING COUNT(DISTINCT dl.id) > 0 OR COUNT(DISTINCT r.id) > 0
ORDER BY s.closed_at DESC
LIMIT 30;

-- =============================================================================
-- BƯỚC 2: Phân tích ca cụ thể bị thiếu
-- =============================================================================

-- 2.1. Chọn 1 ca để debug (thay đổi shift_id theo ca bạn muốn kiểm tra)
WITH debug_shift AS (
    SELECT id FROM shifts
    WHERE status = 'CLOSED'
    ORDER BY closed_at DESC
    LIMIT 1
)
SELECT
    'Phiếu thu trong debt_ledger' AS nguon,
    dl.id,
    dl.ref_id,
    c.name AS customer,
    dl.credit AS amount,
    dl.ledger_at,
    dl.notes
FROM debt_ledger dl
INNER JOIN debug_shift ds ON ds.id = dl.shift_id
INNER JOIN customers c ON c.id = dl.customer_id
WHERE dl.ref_type = 'RECEIPT'
  AND c.type != 'INTERNAL'
UNION ALL
SELECT
    'Phiếu thu trong receipts' AS nguon,
    r.id,
    r.id AS ref_id,
    c.name AS customer,
    rd.amount,
    r.receipt_at,
    r.notes
FROM receipts r
INNER JOIN debug_shift ds ON ds.id = r.shift_id
LEFT JOIN receipt_details rd ON rd.receipt_id = r.id
LEFT JOIN customers c ON c.id = rd.customer_id
ORDER BY nguon, ledger_at;

-- =============================================================================
-- BƯỚC 3: Kiểm tra cấu trúc bảng receipts
-- =============================================================================

-- 3.1. Xem cấu trúc bảng receipts
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'receipts'
ORDER BY ordinal_position;

-- 3.2. Xem dữ liệu mẫu từ receipts (nếu có)
SELECT * FROM receipts
ORDER BY created_at DESC
LIMIT 5;

-- =============================================================================
-- KẾT LUẬN VÀ GIẢI PHÁP
-- =============================================================================
--
-- Nếu phần 1.1 hoặc 1.2 có kết quả:
--   → Dữ liệu cũ có debt_ledger/cash_ledger nhưng KHÔNG có receipts
--   → Cần BACKFILL: Tạo bản ghi trong receipts + receipt_details từ debt_ledger
--
-- Nếu phần 1.3 cho thấy số_debt_ledger_receipt > số_receipts_table:
--   → Xác nhận có data bị thiếu trong receipts
--
-- Giải pháp:
--   → Tạo script backfill để insert vào receipts từ debt_ledger
--   → Script sẽ được tạo riêng: backfill-receipts-from-debt-ledger.sql
--
-- =============================================================================
