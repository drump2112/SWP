-- Make warehouse_id nullable in export_orders table for multi-warehouse support
ALTER TABLE export_orders ALTER COLUMN warehouse_id DROP NOT NULL;
