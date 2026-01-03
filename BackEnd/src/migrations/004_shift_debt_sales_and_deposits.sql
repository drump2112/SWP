-- Migration 004: Shift Debt Sales and Cash Deposits

-- Bảng doanh số bán công nợ theo ca
CREATE TABLE IF NOT EXISTS shift_debt_sales (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity DECIMAL(18, 3) NOT NULL,
  unit_price DECIMAL(18, 2) NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_shift_debt_quantity CHECK (quantity > 0),
  CONSTRAINT ck_shift_debt_amount CHECK (amount >= 0)
);

-- Index cho truy vấn nhanh
CREATE INDEX idx_shift_debt_sales_shift ON shift_debt_sales(shift_id);
CREATE INDEX idx_shift_debt_sales_customer ON shift_debt_sales(customer_id);
CREATE INDEX idx_shift_debt_sales_product ON shift_debt_sales(product_id);

-- Bảng phiếu nộp tiền về công ty
CREATE TABLE IF NOT EXISTS cash_deposits (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
  amount DECIMAL(18, 2) NOT NULL,
  deposit_date DATE NOT NULL,
  deposit_time TIME,
  receiver_name VARCHAR(100),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_deposit_amount CHECK (amount > 0)
);

-- Index cho cash deposits
CREATE INDEX idx_cash_deposits_store ON cash_deposits(store_id, deposit_date);
CREATE INDEX idx_cash_deposits_shift ON cash_deposits(shift_id);

-- Thêm comment
COMMENT ON TABLE shift_debt_sales IS 'Doanh số bán công nợ trong ca';
COMMENT ON TABLE cash_deposits IS 'Phiếu nộp tiền về công ty';
COMMENT ON COLUMN shift_debt_sales.amount IS 'Thành tiền = quantity * unit_price';
COMMENT ON COLUMN cash_deposits.receiver_name IS 'Tên người nhận tiền tại công ty';
