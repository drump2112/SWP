-- Script SQL để thêm cột payment_method vào các bảng
-- Chạy script này trên database fuel_management

-- 1. Thêm payment_method vào bảng sales
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'CASH';

COMMENT ON COLUMN sales.payment_method IS 'CASH (tiền mặt), BANK_TRANSFER (chuyển khoản), DEBT (công nợ)';

-- 2. Thêm payment_method vào bảng receipts
ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'CASH';

COMMENT ON COLUMN receipts.payment_method IS 'CASH (thu tiền mặt), BANK_TRANSFER (thu chuyển khoản)';

-- 3. Thêm payment_method vào bảng cash_deposits
ALTER TABLE cash_deposits
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'CASH';

COMMENT ON COLUMN cash_deposits.payment_method IS 'CASH (nộp tiền mặt), BANK_TRANSFER (nộp chuyển khoản)';

-- 4. Thêm payment_method vào bảng expenses (nếu bảng đã tồn tại)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'CASH';

COMMENT ON COLUMN expenses.payment_method IS 'CASH (chi tiền mặt), BANK_TRANSFER (chi chuyển khoản)';

-- 5. Tạo bảng expense_categories (nếu chưa có)
CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tạo bảng expenses (nếu chưa có)
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
  expense_category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  amount DECIMAL(18, 2) NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  payment_method VARCHAR(20) DEFAULT 'CASH',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tạo indexes cho expenses
CREATE INDEX IF NOT EXISTS idx_expenses_store ON expenses (store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_shift ON expenses (shift_id);

-- 8. Seed dữ liệu danh mục chi phí
INSERT INTO expense_categories (code, name, description) VALUES
  ('642', 'Chi phí quản lý doanh nghiệp', 'Chi phí quản lý DN theo TT200'),
  ('641', 'Chi phí bán hàng', 'Chi phí phát sinh trong quá trình tiêu thụ sản phẩm'),
  ('627', 'Chi phí dịch vụ mua ngoài', 'Chi phí dịch vụ thuê ngoài'),
  ('811', 'Chi phí khác', 'Các khoản chi phí khác')
ON CONFLICT (code) DO NOTHING;

-- 9. Kiểm tra kết quả
SELECT 'sales' as table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sales' AND column_name = 'payment_method'
UNION ALL
SELECT 'receipts', column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'receipts' AND column_name = 'payment_method'
UNION ALL
SELECT 'cash_deposits', column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'cash_deposits' AND column_name = 'payment_method'
UNION ALL
SELECT 'expenses', column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'expenses' AND column_name = 'payment_method';

-- 10. Kiểm tra danh mục chi phí
SELECT * FROM expense_categories ORDER BY code;
