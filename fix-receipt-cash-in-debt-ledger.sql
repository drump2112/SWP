-- =============================================================================
-- Migration: Fix công nợ cửa hàng cho các phiếu thu tiền mặt
-- File: fix-receipt-cash-in-debt-ledger.sql
--
-- VẤN ĐỀ:
-- - Trước đây khi thu tiền mặt từ khách nợ, KHÔNG ghi DEBIT cho khách INTERNAL
-- - Khi nộp tiền từ phiếu thu, KHÔNG ghi CREDIT cho khách INTERNAL (bị skip)
-- - Kết quả: Công nợ cửa hàng KHÔNG khớp với Sổ quỹ
--
-- GIẢI PHÁP:
-- 1. Bổ sung DEBIT RECEIPT_CASH_IN cho phiếu thu tiền mặt
-- 2. Bổ sung CREDIT DEPOSIT cho phiếu nộp tiền mặt
--
-- CÁCH CHẠY:
-- 1. Chạy phần PREVIEW trước để xem dữ liệu sẽ được thêm
-- 2. Nếu OK, chạy phần EXECUTE
-- 3. Chạy phần VERIFY để kiểm tra kết quả
--
-- LƯU Ý: Script này có thể chạy nhiều lần (idempotent) vì check NOT EXISTS
-- =============================================================================

-- =============================================================================
-- PHẦN 1: PREVIEW - Xem trước dữ liệu sẽ được thêm
-- =============================================================================

-- 1.1. Xem phiếu thu tiền mặt cần bổ sung DEBIT cho INTERNAL
SELECT
    '[DEBIT sẽ thêm]' AS action,
    r.id AS receipt_id,
    st.name AS store_name,
    ic.name AS internal_customer,
    r.amount,
    r.receipt_at,
    r.notes
FROM receipts r
INNER JOIN shifts s ON r.shift_id = s.id
INNER JOIN stores st ON st.id = r.store_id
INNER JOIN customer_stores cs ON cs.store_id = r.store_id
INNER JOIN customers ic ON ic.id = cs.customer_id AND ic.type = 'INTERNAL'
WHERE r.payment_method = 'CASH'
  AND s.status = 'CLOSED'
  AND NOT EXISTS (
    SELECT 1 FROM debt_ledger dl
    WHERE dl.ref_type = 'RECEIPT_CASH_IN'
      AND dl.ref_id = r.id
      AND dl.customer_id = ic.id
  )
ORDER BY r.id;

-- 1.2. Xem phiếu nộp tiền mặt cần bổ sung CREDIT cho INTERNAL
SELECT
    '[CREDIT sẽ thêm]' AS action,
    cd.id AS deposit_id,
    st.name AS store_name,
    ic.name AS internal_customer,
    cd.amount,
    cd.deposit_at,
    cd.notes
FROM cash_deposits cd
INNER JOIN shifts s ON cd.shift_id = s.id
INNER JOIN stores st ON st.id = cd.store_id
INNER JOIN customer_stores cs ON cs.store_id = cd.store_id
INNER JOIN customers ic ON ic.id = cs.customer_id AND ic.type = 'INTERNAL'
WHERE cd.payment_method = 'CASH'
  AND s.status = 'CLOSED'
  AND NOT EXISTS (
    SELECT 1 FROM debt_ledger dl
    WHERE dl.ref_type = 'DEPOSIT'
      AND dl.ref_id = cd.id
      AND dl.customer_id = ic.id
      AND dl.credit > 0
  )
ORDER BY cd.id;


-- =============================================================================
-- PHẦN 2: EXECUTE - Thực thi migration (CHẠY SAU KHI REVIEW!)
-- =============================================================================

-- Bắt đầu transaction
BEGIN;

-- 2.1. Insert DEBIT RECEIPT_CASH_IN cho phiếu thu tiền mặt
INSERT INTO debt_ledger (
    customer_id, store_id, shift_id, ref_type, ref_id,
    debit, credit, notes, ledger_at, created_at
)
SELECT
    ic.id AS customer_id,
    r.store_id,
    r.shift_id,
    'RECEIPT_CASH_IN' AS ref_type,
    r.id AS ref_id,
    r.amount AS debit,
    0 AS credit,
    '[Migration] Thu tiền mặt từ khách nợ - Tiền vào quỹ' AS notes,
    COALESCE(r.receipt_at, s.closed_at, NOW()) AS ledger_at,
    NOW() AS created_at
FROM receipts r
INNER JOIN shifts s ON r.shift_id = s.id
INNER JOIN customer_stores cs ON cs.store_id = r.store_id
INNER JOIN customers ic ON ic.id = cs.customer_id AND ic.type = 'INTERNAL'
WHERE r.payment_method = 'CASH'
  AND s.status = 'CLOSED'
  AND NOT EXISTS (
    SELECT 1 FROM debt_ledger dl
    WHERE dl.ref_type = 'RECEIPT_CASH_IN'
      AND dl.ref_id = r.id
      AND dl.customer_id = ic.id
  );

-- Báo số dòng đã insert
-- (PostgreSQL sẽ hiện số dòng affected)

-- 2.2. Insert CREDIT DEPOSIT cho phiếu nộp tiền mặt
INSERT INTO debt_ledger (
    customer_id, store_id, shift_id, ref_type, ref_id,
    debit, credit, notes, ledger_at, created_at
)
SELECT
    ic.id AS customer_id,
    cd.store_id,
    cd.shift_id,
    'DEPOSIT' AS ref_type,
    cd.id AS ref_id,
    0 AS debit,
    cd.amount AS credit,
    '[Migration] Nộp tiền về công ty - Giảm nợ' AS notes,
    COALESCE(cd.deposit_at, s.closed_at, NOW()) AS ledger_at,
    NOW() AS created_at
FROM cash_deposits cd
INNER JOIN shifts s ON cd.shift_id = s.id
INNER JOIN customer_stores cs ON cs.store_id = cd.store_id
INNER JOIN customers ic ON ic.id = cs.customer_id AND ic.type = 'INTERNAL'
WHERE cd.payment_method = 'CASH'
  AND s.status = 'CLOSED'
  AND NOT EXISTS (
    SELECT 1 FROM debt_ledger dl
    WHERE dl.ref_type = 'DEPOSIT'
      AND dl.ref_id = cd.id
      AND dl.customer_id = ic.id
      AND dl.credit > 0
  );

-- Commit transaction
COMMIT;


-- =============================================================================
-- PHẦN 3: VERIFY - Kiểm tra kết quả sau khi chạy
-- =============================================================================

-- 3.1. So sánh Công nợ INTERNAL vs Sổ quỹ theo từng cửa hàng
SELECT
    st.name AS store_name,
    ic.name AS internal_customer,
    COALESCE(debt.total_debit, 0) AS tong_debit,
    COALESCE(debt.total_credit, 0) AS tong_credit,
    COALESCE(debt.total_debit, 0) - COALESCE(debt.total_credit, 0) AS cong_no_internal,
    COALESCE(cash.total_in, 0) AS tong_cash_in,
    COALESCE(cash.total_out, 0) AS tong_cash_out,
    COALESCE(cash.total_in, 0) - COALESCE(cash.total_out, 0) AS so_quy,
    CASE
        WHEN ABS((COALESCE(debt.total_debit, 0) - COALESCE(debt.total_credit, 0)) -
                 (COALESCE(cash.total_in, 0) - COALESCE(cash.total_out, 0))) < 1
        THEN '✅ KHỚP'
        ELSE '⚠️ LỆCH: ' ||
             ((COALESCE(debt.total_debit, 0) - COALESCE(debt.total_credit, 0)) -
              (COALESCE(cash.total_in, 0) - COALESCE(cash.total_out, 0)))::TEXT
    END AS trang_thai
FROM stores st
INNER JOIN customer_stores cs ON cs.store_id = st.id
INNER JOIN customers ic ON ic.id = cs.customer_id AND ic.type = 'INTERNAL'
LEFT JOIN (
    SELECT
        dl.store_id,
        dl.customer_id,
        SUM(dl.debit) AS total_debit,
        SUM(dl.credit) AS total_credit
    FROM debt_ledger dl
    WHERE dl.superseded_by_shift_id IS NULL
    GROUP BY dl.store_id, dl.customer_id
) debt ON debt.store_id = st.id AND debt.customer_id = ic.id
LEFT JOIN (
    SELECT
        cl.store_id,
        SUM(cl.cash_in) AS total_in,
        SUM(cl.cash_out) AS total_out
    FROM cash_ledger cl
    GROUP BY cl.store_id
) cash ON cash.store_id = st.id
ORDER BY st.name;

-- 3.2. Xem chi tiết các bản ghi mới được thêm
SELECT
    '[DEBIT mới]' AS loai,
    dl.id,
    c.name AS khach_hang,
    st.name AS cua_hang,
    dl.debit,
    dl.credit,
    dl.ref_type,
    dl.ref_id,
    dl.notes,
    dl.ledger_at,
    dl.created_at
FROM debt_ledger dl
INNER JOIN customers c ON c.id = dl.customer_id
INNER JOIN stores st ON st.id = dl.store_id
WHERE dl.ref_type = 'RECEIPT_CASH_IN'
  AND dl.notes LIKE '[Migration]%'
ORDER BY dl.created_at DESC
LIMIT 20;

SELECT
    '[CREDIT mới]' AS loai,
    dl.id,
    c.name AS khach_hang,
    st.name AS cua_hang,
    dl.debit,
    dl.credit,
    dl.ref_type,
    dl.ref_id,
    dl.notes,
    dl.ledger_at,
    dl.created_at
FROM debt_ledger dl
INNER JOIN customers c ON c.id = dl.customer_id
INNER JOIN stores st ON st.id = dl.store_id
WHERE dl.ref_type = 'DEPOSIT'
  AND dl.credit > 0
  AND dl.notes LIKE '[Migration]%'
ORDER BY dl.created_at DESC
LIMIT 20;


-- =============================================================================
-- PHẦN 3.5: DEBUG - Phân tích cửa hàng bị lệch lớn (VD: CH 371)
-- =============================================================================

-- 3.5.1. So sánh chi tiết Cash Ledger vs Debt Ledger của 1 cửa hàng
-- Thay đổi store_id theo cửa hàng cần debug
WITH store_debug AS (
    SELECT id FROM stores WHERE name LIKE '%371%' LIMIT 1
)
SELECT
    'CASH_LEDGER' AS source,
    cl.ref_type,
    COUNT(*) AS so_luong,
    SUM(cl.cash_in) AS total_in,
    SUM(cl.cash_out) AS total_out
FROM cash_ledger cl, store_debug sd
WHERE cl.store_id = sd.id
GROUP BY cl.ref_type
UNION ALL
SELECT
    'DEBT_LEDGER' AS source,
    dl.ref_type,
    COUNT(*) AS so_luong,
    SUM(dl.debit) AS total_debit,
    SUM(dl.credit) AS total_credit
FROM debt_ledger dl
INNER JOIN store_debug sd ON dl.store_id = sd.id
INNER JOIN customers c ON c.id = dl.customer_id AND c.type = 'INTERNAL'
WHERE dl.superseded_by_shift_id IS NULL
GROUP BY dl.ref_type
ORDER BY source, ref_type;

-- 3.5.2. Tìm các giao dịch CashIn không có DEBIT tương ứng
WITH store_debug AS (
    SELECT id FROM stores WHERE name LIKE '%371%' LIMIT 1
)
SELECT
    'CashIn thiếu DEBIT' AS van_de,
    cl.id AS cash_ledger_id,
    cl.ref_type,
    cl.ref_id,
    cl.cash_in,
    cl.notes,
    cl.ledger_at
FROM cash_ledger cl
INNER JOIN store_debug sd ON cl.store_id = sd.id
INNER JOIN customer_stores cs ON cs.store_id = sd.id
INNER JOIN customers ic ON ic.id = cs.customer_id AND ic.type = 'INTERNAL'
WHERE cl.cash_in > 0
  AND NOT EXISTS (
    SELECT 1 FROM debt_ledger dl
    WHERE dl.customer_id = ic.id
      AND dl.store_id = cl.store_id
      AND dl.debit > 0
      AND (
        (dl.ref_type = cl.ref_type AND dl.ref_id = cl.ref_id)
        OR (dl.ref_type = 'RECEIPT_CASH_IN' AND cl.ref_type = 'RECEIPT' AND dl.ref_id = cl.ref_id)
        OR (dl.ref_type = 'RETAIL_SALE' AND cl.ref_type = 'SHIFT_CLOSE')
      )
  )
ORDER BY cl.ledger_at;

-- 3.5.3. Tìm các giao dịch CashOut không có CREDIT tương ứng
WITH store_debug AS (
    SELECT id FROM stores WHERE name LIKE '%371%' LIMIT 1
)
SELECT
    'CashOut thiếu CREDIT' AS van_de,
    cl.id AS cash_ledger_id,
    cl.ref_type,
    cl.ref_id,
    cl.cash_out,
    cl.notes,
    cl.ledger_at
FROM cash_ledger cl
INNER JOIN store_debug sd ON cl.store_id = sd.id
INNER JOIN customer_stores cs ON cs.store_id = sd.id
INNER JOIN customers ic ON ic.id = cs.customer_id AND ic.type = 'INTERNAL'
WHERE cl.cash_out > 0
  AND NOT EXISTS (
    SELECT 1 FROM debt_ledger dl
    WHERE dl.customer_id = ic.id
      AND dl.store_id = cl.store_id
      AND dl.credit > 0
      AND dl.ref_type = 'DEPOSIT'
      AND dl.ref_id = cl.ref_id
  )
ORDER BY cl.ledger_at;


-- =============================================================================
-- PHẦN 4: ROLLBACK - Nếu cần hoàn tác
-- =============================================================================

-- CẢNH BÁO: Chỉ chạy nếu cần rollback!
-- Xóa các bản ghi được tạo bởi migration

-- DELETE FROM debt_ledger
-- WHERE ref_type = 'RECEIPT_CASH_IN'
--   AND notes LIKE '[Migration]%';

-- DELETE FROM debt_ledger
-- WHERE ref_type = 'DEPOSIT'
--   AND credit > 0
--   AND notes LIKE '[Migration]%';
