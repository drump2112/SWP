-- 1. Thêm cột opening_stock_json vào bảng shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS opening_stock_json JSON DEFAULT NULL COMMENT 'JSON lưu tồn đầu ca theo sản phẩm';

-- 2. Backfill tồn đầu ca cho tất cả shifts
-- Tính tồn đầu = SUM(quantity_in - quantity_out) từ các dòng TRƯỚC shift hiện tại

-- Tạo bảng tạm để lưu dữ liệu backfill
CREATE TEMPORARY TABLE temp_opening_stock AS
SELECT
    s.id AS shift_id,
    s.store_id,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'productId', p.id,
            'productCode', p.code,
            'productName', p.name,
            'openingStock', COALESCE(
                SUM(CASE
                    WHEN il.shift_id < s.id OR il.shift_id IS NULL
                    THEN (il.quantity_in - il.quantity_out)
                    ELSE 0
                END),
                0
            )
        )
    ) AS opening_stock_data
FROM shifts s
CROSS JOIN products p
LEFT JOIN inventory_ledger il ON
    il.product_id = p.id
    AND il.warehouse_id = s.store_id
    AND (il.shift_id < s.id OR il.shift_id IS NULL)
WHERE p.is_active = 1
GROUP BY s.id, s.store_id, p.id;

-- 3. Update shifts với dữ liệu backfill
UPDATE shifts s
SET opening_stock_json = (
    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'productId', JSON_EXTRACT(item, '$.productId'),
            'productCode', JSON_EXTRACT(item, '$.productCode'),
            'productName', JSON_EXTRACT(item, '$.productName'),
            'openingStock', JSON_EXTRACT(item, '$.openingStock')
        )
    )
    FROM temp_opening_stock t
    WHERE t.shift_id = s.id
)
WHERE EXISTS (
    SELECT 1 FROM temp_opening_stock t WHERE t.shift_id = s.id
);

-- 4. Drop bảng tạm
DROP TEMPORARY TABLE IF EXISTS temp_opening_stock;

-- 5. Verify
SELECT id, shift_no, opening_stock_json FROM shifts LIMIT 5;
