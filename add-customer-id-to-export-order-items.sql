-- Thêm cột customer_id vào bảng export_order_items
ALTER TABLE export_order_items
ADD COLUMN customer_id INTEGER;

-- Thêm foreign key constraint
ALTER TABLE export_order_items
ADD CONSTRAINT fk_export_order_items_customer
FOREIGN KEY (customer_id) REFERENCES commercial_customers(id)
ON DELETE CASCADE;

-- Kiểm tra sau khi thêm
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'export_order_items'
ORDER BY ordinal_position;
