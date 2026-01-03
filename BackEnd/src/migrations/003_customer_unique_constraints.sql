-- Add unique constraints for customer data integrity

-- 1. Unique tax code (when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tax_code_unique
ON customers(tax_code)
WHERE tax_code IS NOT NULL AND tax_code != '';

-- 2. Unique name + phone combination (when phone not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_name_phone_unique
ON customers(LOWER(name), phone)
WHERE phone IS NOT NULL AND phone != '';

-- 3. Make code NOT NULL (always required)
ALTER TABLE customers
ALTER COLUMN code SET NOT NULL;

COMMENT ON INDEX idx_customers_tax_code_unique IS 'Ensure unique tax code for companies';
COMMENT ON INDEX idx_customers_name_phone_unique IS 'Prevent duplicate customers with same name and phone';
