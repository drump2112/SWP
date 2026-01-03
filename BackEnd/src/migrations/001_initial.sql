-- =====================================================
-- FUEL MANAGEMENT SYSTEM - LEDGER FIRST DESIGN
-- PostgreSQL Initial Migration
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ROLES & PERMISSIONS
-- =====================================================

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id INT REFERENCES roles(id),
    permission_id INT REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    role_id INT REFERENCES roles(id),
    store_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT now()
);

-- =====================================================
-- 2. ORGANIZATION
-- =====================================================

CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    region_id INT REFERENCES regions(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- 3. PRODUCTS & PRICING
-- =====================================================

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    unit VARCHAR(50),
    is_fuel BOOLEAN DEFAULT FALSE
);

CREATE TABLE product_prices (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id),
    region_id INT REFERENCES regions(id),
    price NUMERIC(18,2) NOT NULL,
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_product_prices_lookup
ON product_prices(product_id, region_id, valid_from, valid_to);

-- =====================================================
-- 4. SHIFTS & PUMP READINGS
-- =====================================================

CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    store_id INT REFERENCES stores(id),
    shift_date DATE NOT NULL,
    shift_no INT NOT NULL,
    opened_at TIMESTAMP,
    closed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'OPEN'
);

CREATE UNIQUE INDEX ux_shift_store_date
ON shifts(store_id, shift_date, shift_no);

CREATE TABLE pump_readings (
    id SERIAL PRIMARY KEY,
    shift_id INT REFERENCES shifts(id),
    pump_code VARCHAR(50),
    product_id INT REFERENCES products(id),
    start_value NUMERIC(18,3),
    end_value NUMERIC(18,3),
    quantity NUMERIC(18,3)
);

-- =====================================================
-- 5. CUSTOMERS & DEBT
-- =====================================================

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    tax_code VARCHAR(50)
);

CREATE TABLE customer_stores (
    customer_id INT REFERENCES customers(id),
    store_id INT REFERENCES stores(id),
    PRIMARY KEY (customer_id, store_id)
);

CREATE TABLE debt_ledger (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    store_id INT REFERENCES stores(id),
    ref_type VARCHAR(50),
    ref_id INT,
    debit NUMERIC(18,2) DEFAULT 0,
    credit NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_debt_ledger_customer
ON debt_ledger(customer_id, created_at);

-- =====================================================
-- 6. SALES & RECEIPTS
-- =====================================================

CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    shift_id INT REFERENCES shifts(id),
    store_id INT REFERENCES stores(id),
    product_id INT REFERENCES products(id),
    quantity NUMERIC(18,3),
    unit_price NUMERIC(18,2),
    amount NUMERIC(18,2),
    customer_id INT REFERENCES customers(id)
);

CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    store_id INT REFERENCES stores(id),
    shift_id INT REFERENCES shifts(id),
    receipt_type VARCHAR(50),
    amount NUMERIC(18,2),
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE receipt_details (
    id SERIAL PRIMARY KEY,
    receipt_id INT REFERENCES receipts(id),
    customer_id INT REFERENCES customers(id),
    amount NUMERIC(18,2)
);

-- =====================================================
-- 7. WAREHOUSE & INVENTORY
-- =====================================================

CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20),
    store_id INT REFERENCES stores(id)
);

CREATE TABLE inventory_documents (
    id SERIAL PRIMARY KEY,
    warehouse_id INT REFERENCES warehouses(id),
    doc_type VARCHAR(50),
    doc_date DATE,
    ref_shift_id INT REFERENCES shifts(id),
    status VARCHAR(20)
);

CREATE TABLE inventory_document_items (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES inventory_documents(id),
    product_id INT REFERENCES products(id),
    quantity NUMERIC(18,3),
    unit_price NUMERIC(18,2)
);

CREATE TABLE inventory_ledger (
    id SERIAL PRIMARY KEY,
    warehouse_id INT REFERENCES warehouses(id),
    product_id INT REFERENCES products(id),
    ref_type VARCHAR(50),
    ref_id INT,
    quantity_in NUMERIC(18,3) DEFAULT 0,
    quantity_out NUMERIC(18,3) DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_inventory_ledger_lookup
ON inventory_ledger(warehouse_id, product_id, created_at);

-- =====================================================
-- 8. CASH LEDGER
-- =====================================================

CREATE TABLE cash_ledger (
    id SERIAL PRIMARY KEY,
    store_id INT REFERENCES stores(id),
    ref_type VARCHAR(50),
    ref_id INT,
    cash_in NUMERIC(18,2) DEFAULT 0,
    cash_out NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_cash_ledger_store
ON cash_ledger(store_id, created_at);

-- =====================================================
-- 9. SHIFT ADJUSTMENTS
-- =====================================================

CREATE TABLE shift_adjustments (
    id SERIAL PRIMARY KEY,
    shift_id INT REFERENCES shifts(id),
    adjustment_type VARCHAR(50),
    reason TEXT,
    created_by INT REFERENCES users(id),
    approved_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now()
);

-- =====================================================
-- 10. AUDIT LOGS
-- =====================================================

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    record_id INT,
    action VARCHAR(20),
    old_data JSONB,
    new_data JSONB,
    changed_by INT REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT now()
);

-- =====================================================
-- 11. SEED DATA
-- =====================================================

-- Insert roles
INSERT INTO roles (code, name) VALUES
('ADMIN', 'Admin'),
('DIRECTOR', 'Giám đốc'),
('SALES', 'Phòng kinh doanh'),
('ACCOUNTING', 'Phòng kế toán'),
('STORE', 'Cửa hàng');

-- Insert sample admin user (password: admin123)
-- Hash generated with bcrypt for 'admin123'
INSERT INTO users (username, password_hash, full_name, role_id, is_active) VALUES
('admin', '$2b$10$rBV2HQ8V.9bNsqz3T8rAouqY5b5vQp.Z9eQf0lqvGz6Wm8fY8jP3i', 'Administrator', 1, TRUE);

-- Insert sample region
INSERT INTO regions (name) VALUES ('Miền Bắc'), ('Miền Trung'), ('Miền Nam');

-- Insert sample products
INSERT INTO products (code, name, unit, is_fuel) VALUES
('E5', 'Xăng E5', 'Lít', TRUE),
('RON95', 'Xăng RON 95', 'Lít', TRUE),
('DO', 'Dầu Diesel', 'Lít', TRUE),
('OIL', 'Dầu nhớt', 'Chai', FALSE);
