-- Add address, phone, and credit_limit columns to customers table

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS address VARCHAR(500),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for phone lookup
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

COMMENT ON COLUMN customers.address IS 'Customer address';
COMMENT ON COLUMN customers.phone IS 'Customer phone number';
COMMENT ON COLUMN customers.credit_limit IS 'Maximum credit/debt limit allowed';
COMMENT ON COLUMN customers.notes IS 'Additional notes about customer';
