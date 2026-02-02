-- Add customer_id to export_order_items table
-- Run this script manually in PostgreSQL

BEGIN;

-- 1. Add customer_id column to export_order_items
ALTER TABLE export_order_items
ADD COLUMN IF NOT EXISTS customer_id INTEGER;

-- 2. Add foreign key constraint
ALTER TABLE export_order_items
ADD CONSTRAINT fk_export_order_items_customer
FOREIGN KEY (customer_id)
REFERENCES commercial_customers(id)
ON DELETE RESTRICT;

-- 3. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_export_order_items_customer_id
ON export_order_items(customer_id);

-- 4. Remove customer_id from export_orders (move to item level)
ALTER TABLE export_orders
DROP COLUMN IF EXISTS customer_id CASCADE;

-- 5. Add vehicle tracking fields to export_orders
ALTER TABLE export_orders
ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(20);

COMMIT;

-- Verify the changes
\d export_order_items
\d export_orders
