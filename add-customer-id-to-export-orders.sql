-- Thêm cột customer_id vào bảng export_orders
ALTER TABLE export_orders 
ADD COLUMN customer_id INTEGER;

-- Thêm foreign key constraint
ALTER TABLE export_orders
ADD CONSTRAINT fk_export_orders_customer 
FOREIGN KEY (customer_id) REFERENCES commercial_customers(id)
ON DELETE SET NULL;

-- Kiểm tra sau khi thêm
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'export_orders' 
ORDER BY ordinal_position;
