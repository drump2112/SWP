-- Kiểm tra cột trong bảng export_order_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'export_order_items'
ORDER BY ordinal_position;

-- Nếu thiếu customer_id, thêm cột này:
-- ALTER TABLE export_order_items ADD COLUMN customer_id INTEGER;

-- Hoặc thêm cơ foreign key:
-- ALTER TABLE export_order_items
-- ADD COLUMN customer_id INTEGER,
-- ADD CONSTRAINT fk_export_order_items_customer
-- FOREIGN KEY (customer_id) REFERENCES commercial_customers(id);
