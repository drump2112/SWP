-- ============================================================================
-- DATABASE CHUẨN CHO HỆ THỐNG BÁN THƯƠNG MẠI (WHOLESALE DISTRIBUTION)
-- Quản lý theo LÔ HÀNG - Nhiều nhà cung cấp - Tối ưu hiệu suất
-- ============================================================================
-- Version: 2.0
-- Created: 2026-01-31
-- Description: Hệ thống quản lý bán sỉ xăng dầu theo lô hàng và nhà cung cấp
-- ============================================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. NHÀ CUNG CẤP - SUPPLIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(50),
    address VARCHAR(500),
    phone VARCHAR(20),
    email VARCHAR(100),
    contact_person VARCHAR(100),
    bank_account VARCHAR(50),
    bank_name VARCHAR(100),
    payment_terms VARCHAR(100), -- Điều kiện thanh toán
    credit_limit NUMERIC(18,2) DEFAULT 0, -- Hạn mức công nợ với NCC
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

COMMENT ON TABLE suppliers IS 'Nhà cung cấp xăng dầu';
COMMENT ON COLUMN suppliers.payment_terms IS 'VD: 30 ngày, 60 ngày, COD';

-- ============================================================================
-- 2. KHO THƯƠNG MẠI - COMMERCIAL WAREHOUSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS commercial_warehouses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    capacity NUMERIC(18,3), -- Tổng dung tích (lít)
    manager_name VARCHAR(100),
    phone VARCHAR(20),
    region_id INTEGER REFERENCES regions(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_commercial_warehouses_code ON commercial_warehouses(code);
CREATE INDEX idx_commercial_warehouses_region ON commercial_warehouses(region_id);
CREATE INDEX idx_commercial_warehouses_active ON commercial_warehouses(is_active);

COMMENT ON TABLE commercial_warehouses IS 'Kho hàng thương mại - riêng biệt với cửa hàng bán lẻ';

-- ============================================================================
-- 3. NHÓM KHÁCH HÀNG - CUSTOMER GROUPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS commercial_customer_groups (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    credit_limit NUMERIC(18,2) DEFAULT 0, -- Hạn mức công nợ mặc định
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customer_groups_code ON commercial_customer_groups(code);

COMMENT ON TABLE commercial_customer_groups IS 'Nhóm khách hàng: Đại lý 1, Đại lý 2, Cửa hàng, VIP...';
COMMENT ON COLUMN commercial_customer_groups.credit_limit IS 'Hạn mức công nợ mặc định - áp dụng khi tạo khách hàng mới';

-- ============================================================================
-- 4. KHÁCH HÀNG THƯƠNG MẠI - COMMERCIAL CUSTOMERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS commercial_customers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    customer_group_id INTEGER REFERENCES commercial_customer_groups(id),
    tax_code VARCHAR(50),
    address VARCHAR(500),
    phone VARCHAR(20),
    email VARCHAR(100),
    contact_person VARCHAR(100),
    credit_limit NUMERIC(18,2) DEFAULT 0, -- Hạn mức công nợ riêng
    current_debt NUMERIC(18,2) DEFAULT 0, -- Công nợ hiện tại
    payment_terms VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_commercial_customers_code ON commercial_customers(code);
CREATE INDEX idx_commercial_customers_group ON commercial_customers(customer_group_id);
CREATE INDEX idx_commercial_customers_active ON commercial_customers(is_active);
CREATE INDEX idx_commercial_customers_debt ON commercial_customers(current_debt);

COMMENT ON TABLE commercial_customers IS 'Khách hàng thương mại: Đại lý, Cửa hàng con (CH10, CH11...), Công ty...';
COMMENT ON COLUMN commercial_customers.current_debt IS 'Công nợ hiện tại - cập nhật real-time';

-- ============================================================================
-- 5. KÌ GIÁ - PRICE PERIODS
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_periods (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    product_id INTEGER REFERENCES products(id),
    region_id INTEGER REFERENCES regions(id),
    base_price NUMERIC(18,2) NOT NULL, -- Giá gốc
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_price_periods_code ON price_periods(code);
CREATE INDEX idx_price_periods_product ON price_periods(product_id);
CREATE INDEX idx_price_periods_region ON price_periods(region_id);
CREATE INDEX idx_price_periods_dates ON price_periods(effective_from, effective_to);

COMMENT ON TABLE price_periods IS 'Kì giá sản phẩm theo thời gian';
COMMENT ON COLUMN price_periods.code IS 'VD: E5-01-2026, RON95-08-01-2026';

-- ============================================================================
-- 6. LÔ HÀNG NHẬP - IMPORT BATCHES (CORE TABLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_batches (
    id SERIAL PRIMARY KEY,
    batch_code VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id INTEGER NOT NULL REFERENCES commercial_warehouses(id),
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    price_period_id INTEGER REFERENCES price_periods(id),

    -- Số lượng
    import_quantity NUMERIC(18,3) NOT NULL, -- Số lượng nhập
    remaining_quantity NUMERIC(18,3) NOT NULL, -- Số lượng còn lại
    exported_quantity NUMERIC(18,3) DEFAULT 0, -- Số lượng đã xuất

    -- Giá và chiết khấu (NGƯỜI DÙNG NHẬP)
    unit_price NUMERIC(18,2) NOT NULL, -- Giá nhập từ NCC
    discount_percent NUMERIC(5,2) DEFAULT 0, -- % Chiết khấu - NGƯỜI DÙNG NHẬP
    discount_amount NUMERIC(18,2) DEFAULT 0, -- Số tiền chiết khấu - TỰ ĐỘNG TÍNH
    final_unit_price NUMERIC(18,2) NOT NULL, -- Giá sau chiết khấu - TỰ ĐỘNG TÍNH

    -- Thông tin phiếu nhập
    import_date DATE NOT NULL,
    import_time TIME,
    invoice_number VARCHAR(100), -- Số hóa đơn
    vehicle_number VARCHAR(50), -- Biển số xe

    -- Thuế
    vat_percent NUMERIC(5,2) DEFAULT 0, -- Thuế VAT
    vat_amount NUMERIC(18,2) DEFAULT 0,
    environmental_tax_rate NUMERIC(10,2) DEFAULT 0, -- Thuế BVMT
    environmental_tax_amount NUMERIC(18,2) DEFAULT 0,

    -- Tổng tiền
    subtotal NUMERIC(18,2) NOT NULL, -- Thành tiền trước thuế
    total_amount NUMERIC(18,2) NOT NULL, -- Tổng tiền sau thuế

    -- Trạng thái
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, DEPLETED, CANCELLED
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes cho hiệu suất cao
CREATE INDEX idx_import_batches_warehouse ON import_batches(warehouse_id);
CREATE INDEX idx_import_batches_supplier ON import_batches(supplier_id);
CREATE INDEX idx_import_batches_product ON import_batches(product_id);
CREATE INDEX idx_import_batches_price_period ON import_batches(price_period_id);
CREATE INDEX idx_import_batches_date ON import_batches(import_date);
CREATE INDEX idx_import_batches_status ON import_batches(status);
CREATE INDEX idx_import_batches_remaining ON import_batches(warehouse_id, product_id, supplier_id, remaining_quantity)
    WHERE remaining_quantity > 0;
CREATE INDEX idx_import_batches_lookup ON import_batches(warehouse_id, product_id, supplier_id, status)
    WHERE status = 'ACTIVE' AND remaining_quantity > 0;

COMMENT ON TABLE import_batches IS 'Lô hàng nhập - quản lý tồn kho theo batch (FIFO/FEFO)';
COMMENT ON COLUMN import_batches.remaining_quantity IS 'Số lượng còn lại - cập nhật khi xuất hàng';
COMMENT ON COLUMN import_batches.status IS 'ACTIVE: còn hàng, DEPLETED: hết hàng, CANCELLED: hủy';

-- ============================================================================
-- 7. ĐơN XUẤT HÀNG - EXPORT ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS export_orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id INTEGER NOT NULL REFERENCES commercial_warehouses(id),
    customer_id INTEGER NOT NULL REFERENCES commercial_customers(id),

    -- Thông tin đơn hàng
    order_date DATE NOT NULL,
    order_time TIME,
    delivery_date DATE,
    delivery_address VARCHAR(500),
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),

    -- Tổng tiền
    subtotal NUMERIC(18,2) DEFAULT 0, -- Tổng trước chiết khấu và thuế
    total_discount NUMERIC(18,2) DEFAULT 0, -- Tổng chiết khấu
    total_vat NUMERIC(18,2) DEFAULT 0, -- Tổng VAT
    total_environmental_tax NUMERIC(18,2) DEFAULT 0, -- Tổng thuế BVMT
    total_amount NUMERIC(18,2) DEFAULT 0, -- Tổng thanh toán

    -- Thanh toán
    payment_method VARCHAR(20) DEFAULT 'DEBT', -- CASH, BANK_TRANSFER, DEBT
    payment_status VARCHAR(20) DEFAULT 'UNPAID', -- PAID, PARTIAL, UNPAID
    paid_amount NUMERIC(18,2) DEFAULT 0,
    debt_amount NUMERIC(18,2) DEFAULT 0,

    -- Trạng thái
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, CONFIRMED, DELIVERED, CANCELLED
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_export_orders_code ON export_orders(order_code);
CREATE INDEX idx_export_orders_warehouse ON export_orders(warehouse_id);
CREATE INDEX idx_export_orders_customer ON export_orders(customer_id);
CREATE INDEX idx_export_orders_date ON export_orders(order_date);
CREATE INDEX idx_export_orders_status ON export_orders(status);
CREATE INDEX idx_export_orders_payment ON export_orders(payment_status);

COMMENT ON TABLE export_orders IS 'Đơn xuất hàng thương mại';
COMMENT ON COLUMN export_orders.total_environmental_tax IS 'Tổng thuế bảo vệ môi trường';

-- ============================================================================
-- 8. CHI TIẾT ĐƠN XUẤT THEO LÔ - EXPORT ORDER ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS export_order_items (
    id SERIAL PRIMARY KEY,
    export_order_id INTEGER NOT NULL REFERENCES export_orders(id) ON DELETE CASCADE,
    import_batch_id INTEGER NOT NULL REFERENCES import_batches(id), -- Link đến lô nhập
    product_id INTEGER NOT NULL REFERENCES products(id),

    -- Số lượng
    quantity NUMERIC(18,3) NOT NULL,

    -- Giá (từ lô nhập + markup)
    batch_unit_price NUMERIC(18,2) NOT NULL, -- Giá vốn từ lô nhập
    selling_price NUMERIC(18,2) NOT NULL, -- Giá bán - NGƯỜI DÙNG NHẬP
    markup_percent NUMERIC(5,2) DEFAULT 0, -- % lợi nhuận - TỰ ĐỘNG TÍNH
    discount_percent NUMERIC(5,2) DEFAULT 0, -- % Chiết khấu - NGƯỜI DÙNG NHẬP
    discount_amount NUMERIC(18,2) DEFAULT 0, -- Số tiền chiết khấu - TỰ ĐỘNG TÍNH

    -- Thuế
    vat_percent NUMERIC(5,2) DEFAULT 0,
    vat_amount NUMERIC(18,2) DEFAULT 0,
    environmental_tax_rate NUMERIC(10,2) DEFAULT 0, -- Thuế BVMT đơn vị (đ/lít)
    environmental_tax_amount NUMERIC(18,2) DEFAULT 0, -- Tổng thuế BVMT

    -- Tổng tiền
    subtotal NUMERIC(18,2) NOT NULL, -- Số lượng * giá bán
    total_amount NUMERIC(18,2) NOT NULL, -- Tổng sau chiết khấu và thuế

    -- Lợi nhuận
    profit_amount NUMERIC(18,2) DEFAULT 0, -- Lợi nhuận = (giá bán - giá vốn) * số lượng

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_export_items_order ON export_order_items(export_order_id);
CREATE INDEX idx_export_items_batch ON export_order_items(import_batch_id);
CREATE INDEX idx_export_items_product ON export_order_items(product_id);

COMMENT ON TABLE export_order_items IS 'Chi tiết đơn xuất - mỗi dòng link đến 1 lô nhập cụ thể';
COMMENT ON COLUMN export_order_items.import_batch_id IS 'QUAN TRỌNG: Liên kết đến lô hàng nhập để truy xuất nguồn gốc';
COMMENT ON COLUMN export_order_items.discount_percent IS 'Chiết khấu do NGƯỜI DÙNG NHẬP khi tạo đơn xuất, không tự động';
COMMENT ON COLUMN export_order_items.environmental_tax_rate IS 'Thuế BVMT theo đơn vị (VD: 2000đ/lít xăng)';
COMMENT ON COLUMN export_order_items.profit_amount IS 'Lợi nhuận gộp của dòng hàng';

-- ============================================================================
-- 9. CÔNG NỢ KHÁCH HÀNG THƯƠNG MẠI - COMMERCIAL DEBT LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS commercial_debt_ledger (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES commercial_customers(id),
    warehouse_id INTEGER REFERENCES commercial_warehouses(id),

    -- Tham chiếu
    ref_type VARCHAR(50) NOT NULL, -- EXPORT_ORDER, PAYMENT, OPENING_BALANCE, ADJUSTMENT
    ref_id INTEGER,

    -- Phát sinh
    debit NUMERIC(18,2) DEFAULT 0 NOT NULL, -- Nợ tăng (xuất hàng)
    credit NUMERIC(18,2) DEFAULT 0 NOT NULL, -- Nợ giảm (thanh toán)

    -- Số dư sau giao dịch (denormalized cho performance)
    balance NUMERIC(18,2) DEFAULT 0,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_commercial_debt_customer ON commercial_debt_ledger(customer_id, created_at);
CREATE INDEX idx_commercial_debt_warehouse ON commercial_debt_ledger(warehouse_id);
CREATE INDEX idx_commercial_debt_ref ON commercial_debt_ledger(ref_type, ref_id);

COMMENT ON TABLE commercial_debt_ledger IS 'Sổ công nợ khách hàng thương mại';
COMMENT ON COLUMN commercial_debt_ledger.balance IS 'Số dư sau giao dịch - tăng tốc query';

-- ============================================================================
-- 10. THANH TOÁN CÔNG NỢ - DEBT PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS commercial_debt_payments (
    id SERIAL PRIMARY KEY,
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES commercial_customers(id),
    warehouse_id INTEGER REFERENCES commercial_warehouses(id),

    -- Thông tin thanh toán
    payment_date DATE NOT NULL,
    payment_time TIME,
    amount NUMERIC(18,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL, -- CASH, BANK_TRANSFER, CHECK

    -- Thông tin ngân hàng (nếu chuyển khoản)
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    transaction_ref VARCHAR(100),

    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_debt_payments_customer ON commercial_debt_payments(customer_id);
CREATE INDEX idx_debt_payments_date ON commercial_debt_payments(payment_date);

COMMENT ON TABLE commercial_debt_payments IS 'Phiếu thu thanh toán công nợ';

-- ============================================================================
-- 11. TỒN KHO THƯƠNG MẠI - COMMERCIAL INVENTORY SUMMARY
-- ============================================================================

CREATE TABLE IF NOT EXISTS commercial_inventory_summary (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES commercial_warehouses(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),

    -- Tồn kho
    total_quantity NUMERIC(18,3) DEFAULT 0, -- Tổng tồn
    total_value NUMERIC(18,2) DEFAULT 0, -- Tổng giá trị tồn
    average_cost NUMERIC(18,2) DEFAULT 0, -- Giá vốn bình quân

    -- Thống kê
    total_batches INTEGER DEFAULT 0, -- Số lô hàng đang tồn
    oldest_batch_date DATE, -- Ngày lô cũ nhất
    newest_batch_date DATE, -- Ngày lô mới nhất

    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_inventory_summary ON commercial_inventory_summary(warehouse_id, product_id, supplier_id);
CREATE INDEX idx_inventory_warehouse ON commercial_inventory_summary(warehouse_id);
CREATE INDEX idx_inventory_product ON commercial_inventory_summary(product_id);
CREATE INDEX idx_inventory_supplier ON commercial_inventory_summary(supplier_id);

COMMENT ON TABLE commercial_inventory_summary IS 'Tổng hợp tồn kho - cập nhật real-time qua trigger';
COMMENT ON COLUMN commercial_inventory_summary.average_cost IS 'Giá vốn bình quân gia quyền';

-- ============================================================================
-- 12. TRIGGERS - TỰ ĐỘNG CẬP NHẬT DỮ LIỆU
-- ============================================================================

-- Trigger: Tự động tính toán tổng tiền khi nhập lô hàng
CREATE OR REPLACE FUNCTION calculate_import_batch_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Tính chiết khấu
    NEW.discount_amount := NEW.unit_price * NEW.import_quantity * NEW.discount_percent / 100;

    -- Giá sau chiết khấu
    NEW.final_unit_price := NEW.unit_price - (NEW.unit_price * NEW.discount_percent / 100);

    -- Thành tiền trước thuế
    NEW.subtotal := NEW.final_unit_price * NEW.import_quantity;

    -- Tính VAT
    NEW.vat_amount := NEW.subtotal * NEW.vat_percent / 100;

    -- Tính thuế BVMT
    NEW.environmental_tax_amount := NEW.import_quantity * NEW.environmental_tax_rate;

    -- Tổng tiền
    NEW.total_amount := NEW.subtotal + NEW.vat_amount + NEW.environmental_tax_amount;

    -- Khởi tạo remaining_quantity
    IF NEW.remaining_quantity IS NULL OR NEW.remaining_quantity = 0 THEN
        NEW.remaining_quantity := NEW.import_quantity;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_import_batch_calculate
    BEFORE INSERT OR UPDATE ON import_batches
    FOR EACH ROW
    EXECUTE FUNCTION calculate_import_batch_totals();

-- Trigger: Cập nhật tồn kho khi nhập lô hàng
CREATE OR REPLACE FUNCTION update_inventory_on_import()
RETURNS TRIGGER AS $$
BEGIN
    -- Upsert vào bảng tổng hợp tồn kho
    INSERT INTO commercial_inventory_summary (
        warehouse_id, product_id, supplier_id,
        total_quantity, total_value, total_batches,
        oldest_batch_date, newest_batch_date
    )
    VALUES (
        NEW.warehouse_id, NEW.product_id, NEW.supplier_id,
        NEW.import_quantity,
        NEW.total_amount,
        1,
        NEW.import_date,
        NEW.import_date
    )
    ON CONFLICT (warehouse_id, product_id, supplier_id)
    DO UPDATE SET
        total_quantity = commercial_inventory_summary.total_quantity + NEW.import_quantity,
        total_value = commercial_inventory_summary.total_value + NEW.total_amount,
        total_batches = commercial_inventory_summary.total_batches + 1,
        oldest_batch_date = LEAST(commercial_inventory_summary.oldest_batch_date, NEW.import_date),
        newest_batch_date = GREATEST(commercial_inventory_summary.newest_batch_date, NEW.import_date),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_inventory_import
    AFTER INSERT ON import_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_import();

-- Trigger: Tự động tính toán chi tiết đơn xuất
CREATE OR REPLACE FUNCTION calculate_export_item_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Thành tiền trước chiết khấu
    NEW.subtotal := NEW.selling_price * NEW.quantity;

    -- Chiết khấu
    NEW.discount_amount := NEW.subtotal * NEW.discount_percent / 100;

    -- VAT
    NEW.vat_amount := (NEW.subtotal - NEW.discount_amount) * NEW.vat_percent / 100;

    -- Thuế BVMT
    NEW.environmental_tax_amount := NEW.quantity * NEW.environmental_tax_rate;

    -- Tổng tiền
    NEW.total_amount := NEW.subtotal - NEW.discount_amount + NEW.vat_amount + NEW.environmental_tax_amount;

    -- Lợi nhuận gộp
    NEW.profit_amount := (NEW.selling_price - NEW.batch_unit_price) * NEW.quantity;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_export_item_calculate
    BEFORE INSERT OR UPDATE ON export_order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_export_item_totals();

-- Trigger: Cập nhật tổng đơn xuất khi thêm/sửa/xóa chi tiết
CREATE OR REPLACE FUNCTION update_export_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE export_orders SET
        subtotal = (SELECT COALESCE(SUM(subtotal), 0) FROM export_order_items WHERE export_order_id = COALESCE(NEW.export_order_id, OLD.export_order_id)),
        total_discount = (SELECT COALESCE(SUM(discount_amount), 0) FROM export_order_items WHERE export_order_id = COALESCE(NEW.export_order_id, OLD.export_order_id)),
        total_vat = (SELECT COALESCE(SUM(vat_amount), 0) FROM export_order_items WHERE export_order_id = COALESCE(NEW.export_order_id, OLD.export_order_id)),
        total_environmental_tax = (SELECT COALESCE(SUM(environmental_tax_amount), 0) FROM export_order_items WHERE export_order_id = COALESCE(NEW.export_order_id, OLD.export_order_id)),
        total_amount = (SELECT COALESCE(SUM(total_amount), 0) FROM export_order_items WHERE export_order_id = COALESCE(NEW.export_order_id, OLD.export_order_id)),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.export_order_id, OLD.export_order_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_export_totals
    AFTER INSERT OR UPDATE OR DELETE ON export_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_export_order_totals();

-- Trigger: Cập nhật remaining_quantity khi xuất hàng
CREATE OR REPLACE FUNCTION update_batch_on_export()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE import_batches SET
            remaining_quantity = remaining_quantity - NEW.quantity,
            exported_quantity = exported_quantity + NEW.quantity,
            status = CASE
                WHEN remaining_quantity - NEW.quantity <= 0 THEN 'DEPLETED'
                ELSE 'ACTIVE'
            END,
            updated_at = NOW()
        WHERE id = NEW.import_batch_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Hoàn trả khi xóa
        UPDATE import_batches SET
            remaining_quantity = remaining_quantity + OLD.quantity,
            exported_quantity = exported_quantity - OLD.quantity,
            status = 'ACTIVE',
            updated_at = NOW()
        WHERE id = OLD.import_batch_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_batch_export
    AFTER INSERT OR UPDATE OR DELETE ON export_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_on_export();

-- Trigger: Cập nhật công nợ khách hàng
CREATE OR REPLACE FUNCTION update_customer_debt()
RETURNS TRIGGER AS $$
DECLARE
    current_balance NUMERIC(18,2);
BEGIN
    -- Tính số dư hiện tại
    SELECT COALESCE(SUM(debit - credit), 0)
    INTO current_balance
    FROM commercial_debt_ledger
    WHERE customer_id = NEW.customer_id;

    -- Cập nhật số dư vào bản ghi mới
    NEW.balance := current_balance + NEW.debit - NEW.credit;

    -- Cập nhật vào bảng khách hàng
    UPDATE commercial_customers SET
        current_debt = NEW.balance,
        updated_at = NOW()
    WHERE id = NEW.customer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_customer_debt
    BEFORE INSERT ON commercial_debt_ledger
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_debt();

-- ============================================================================
-- 13. VIEWS - BÁO CÁO VÀ TRUY VẤN NHANH
-- ============================================================================

-- View: Tồn kho chi tiết theo lô
CREATE OR REPLACE VIEW v_batch_inventory AS
SELECT
    ib.id AS batch_id,
    ib.batch_code,
    w.code AS warehouse_code,
    w.name AS warehouse_name,
    s.code AS supplier_code,
    s.name AS supplier_name,
    p.code AS product_code,
    p.name AS product_name,
    pp.code AS price_period_code,
    ib.import_date,
    ib.import_quantity,
    ib.remaining_quantity,
    ib.exported_quantity,
    ib.final_unit_price,
    ib.remaining_quantity * ib.final_unit_price AS remaining_value,
    ib.status,
    -- Tuổi lô hàng (ngày)
    CURRENT_DATE - ib.import_date AS age_days
FROM import_batches ib
JOIN commercial_warehouses w ON ib.warehouse_id = w.id
JOIN suppliers s ON ib.supplier_id = s.id
JOIN products p ON ib.product_id = p.id
LEFT JOIN price_periods pp ON ib.price_period_id = pp.id
WHERE ib.status = 'ACTIVE' AND ib.remaining_quantity > 0;

COMMENT ON VIEW v_batch_inventory IS 'Tồn kho chi tiết theo lô - dễ query';

-- View: Gợi ý lô hàng tối ưu khi xuất
CREATE OR REPLACE VIEW v_batch_optimization AS
SELECT
    ib.id AS batch_id,
    ib.batch_code,
    ib.warehouse_id,
    ib.product_id,
    ib.supplier_id,
    w.name AS warehouse_name,
    s.name AS supplier_name,
    p.name AS product_name,
    ib.remaining_quantity,
    ib.final_unit_price AS cost_price,
    pp.base_price AS current_market_price,
    -- Tính lợi nhuận tiềm năng
    (pp.base_price - ib.final_unit_price) AS unit_profit,
    (pp.base_price - ib.final_unit_price) * ib.remaining_quantity AS total_potential_profit,
    -- % lợi nhuận
    ROUND(((pp.base_price - ib.final_unit_price) / ib.final_unit_price * 100), 2) AS profit_margin_percent,
    ib.import_date,
    CURRENT_DATE - ib.import_date AS age_days,
    -- Điểm ưu tiên (càng cao càng nên xuất trước)
    -- = lợi nhuận % * 0.7 + (tuổi lô / 365) * 0.3
    ROUND(
        (((pp.base_price - ib.final_unit_price) / ib.final_unit_price * 100) * 0.7) +
        ((CURRENT_DATE - ib.import_date) / 365.0 * 100 * 0.3),
        2
    ) AS priority_score
FROM import_batches ib
JOIN commercial_warehouses w ON ib.warehouse_id = w.id
JOIN suppliers s ON ib.supplier_id = s.id
JOIN products p ON ib.product_id = p.id
LEFT JOIN price_periods pp ON ib.price_period_id = pp.id
    AND pp.effective_from <= NOW()
    AND (pp.effective_to IS NULL OR pp.effective_to >= NOW())
WHERE ib.status = 'ACTIVE'
    AND ib.remaining_quantity > 0
ORDER BY priority_score DESC;

COMMENT ON VIEW v_batch_optimization IS 'Gợi ý lô hàng tối ưu - ưu tiên lợi nhuận cao và hàng cũ';

-- View: Báo cáo doanh thu theo lô
CREATE OR REPLACE VIEW v_batch_revenue_report AS
SELECT
    ib.id AS batch_id,
    ib.batch_code,
    w.name AS warehouse_name,
    s.name AS supplier_name,
    p.name AS product_name,
    ib.import_date,
    ib.import_quantity,
    ib.exported_quantity,
    ib.remaining_quantity,
    ib.final_unit_price AS cost_price,
    -- Doanh thu từ lô này
    COALESCE(SUM(eoi.quantity * eoi.selling_price), 0) AS total_revenue,
    -- Giá vốn đã bán
    COALESCE(SUM(eoi.quantity * ib.final_unit_price), 0) AS total_cost,
    -- Lợi nhuận gộp
    COALESCE(SUM(eoi.profit_amount), 0) AS gross_profit,
    -- Thuế BVMT
    COALESCE(SUM(eoi.environmental_tax_amount), 0) AS total_env_tax,
    -- Số đơn hàng
    COUNT(DISTINCT eoi.export_order_id) AS total_orders
FROM import_batches ib
JOIN commercial_warehouses w ON ib.warehouse_id = w.id
JOIN suppliers s ON ib.supplier_id = s.id
JOIN products p ON ib.product_id = p.id
LEFT JOIN export_order_items eoi ON ib.id = eoi.import_batch_id
GROUP BY ib.id, ib.batch_code, w.name, s.name, p.name,
         ib.import_date, ib.import_quantity, ib.exported_quantity,
         ib.remaining_quantity, ib.final_unit_price;

COMMENT ON VIEW v_batch_revenue_report IS 'Báo cáo doanh thu và lợi nhuận theo lô hàng';

-- View: Báo cáo công nợ khách hàng
CREATE OR REPLACE VIEW v_customer_debt_report AS
SELECT
    c.id AS customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    cg.name AS customer_group,
    c.credit_limit,
    c.current_debt,
    c.credit_limit - c.current_debt AS available_credit,
    ROUND((c.current_debt / NULLIF(c.credit_limit, 0) * 100), 2) AS debt_usage_percent,
    -- Công nợ quá hạn (TODO: cần bảng theo dõi ngày đến hạn)
    CASE
        WHEN c.current_debt > c.credit_limit THEN c.current_debt - c.credit_limit
        ELSE 0
    END AS overdue_amount
FROM commercial_customers c
LEFT JOIN commercial_customer_groups cg ON c.customer_group_id = cg.id
WHERE c.is_active = TRUE
ORDER BY c.current_debt DESC;

COMMENT ON VIEW v_customer_debt_report IS 'Báo cáo công nợ khách hàng';

-- ============================================================================
-- 14. FUNCTION - GỢI Ý LÔ HÀNG TỐI ƯU CHO XUẤT HÀNG
-- ============================================================================

CREATE OR REPLACE FUNCTION suggest_optimal_batches(
    p_warehouse_id INTEGER,
    p_product_id INTEGER,
    p_quantity NUMERIC,
    p_discount_percent NUMERIC DEFAULT 0
)
RETURNS TABLE (
    batch_id INTEGER,
    batch_code VARCHAR(50),
    supplier_name VARCHAR(255),
    available_quantity NUMERIC(18,3),
    suggested_quantity NUMERIC(18,3),
    cost_price NUMERIC(18,2),
    current_price NUMERIC(18,2),
    after_discount_price NUMERIC(18,2),
    unit_profit NUMERIC(18,2),
    total_profit NUMERIC(18,2),
    priority_score NUMERIC
) AS $$
DECLARE
    remaining_qty NUMERIC := p_quantity;
    batch_rec RECORD;
BEGIN
    -- Lấy danh sách lô hàng theo thứ tự ưu tiên
    FOR batch_rec IN (
        SELECT
            v.*
        FROM v_batch_optimization v
        WHERE v.warehouse_id = p_warehouse_id
            AND v.product_id = p_product_id
        ORDER BY v.priority_score DESC
    ) LOOP
        IF remaining_qty <= 0 THEN
            EXIT;
        END IF;

        batch_id := batch_rec.batch_id;
        batch_code := batch_rec.batch_code;
        supplier_name := batch_rec.supplier_name;
        available_quantity := batch_rec.remaining_quantity;
        suggested_quantity := LEAST(batch_rec.remaining_quantity, remaining_qty);
        cost_price := batch_rec.cost_price;
        current_price := batch_rec.current_market_price;
        after_discount_price := batch_rec.current_market_price * (1 - p_discount_percent / 100);
        unit_profit := after_discount_price - batch_rec.cost_price;
        total_profit := unit_profit * suggested_quantity;
        priority_score := batch_rec.priority_score;

        remaining_qty := remaining_qty - suggested_quantity;

        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION suggest_optimal_batches IS 'Gợi ý lô hàng tối ưu khi xuất - tự động phân bổ số lượng';

-- ============================================================================
-- 15. DỮ LIỆU MẪU - SAMPLE DATA
-- ============================================================================

-- Nhà cung cấp
INSERT INTO suppliers (code, name, tax_code, address, phone, contact_person, payment_terms, credit_limit) VALUES
('NCC001', 'Tổng công ty Xăng dầu Việt Nam - Petrolimex', '0100100100', 'Hà Nội', '024-12345678', 'Nguyễn Văn A', '30 ngày', 500000000),
('NCC002', 'Tập đoàn Dầu khí Việt Nam - PetroVietnam', '0200200200', 'Hà Nội', '024-87654321', 'Trần Thị B', '45 ngày', 1000000000),
('NCC003', 'Công ty CP Xăng dầu Sài Gòn', '0300300300', 'TP.HCM', '028-11111111', 'Lê Văn C', '60 ngày', 300000000),
('NCC004', 'Công ty TNHH Xăng dầu Miền Trung', '0400400400', 'Đà Nẵng', '0236-222222', 'Phạm Thị D', '30 ngày', 200000000)
ON CONFLICT (code) DO NOTHING;

-- Kho thương mại
INSERT INTO commercial_warehouses (code, name, address, capacity, manager_name, phone, region_id) VALUES
('KTM01', 'Kho thương mại Hà Nội', 'KCN Thăng Long, Hà Nội', 500000.000, 'Hoàng Văn E', '0901111111', 1),
('KTM02', 'Kho thương mại Đà Nẵng', 'KCN Hòa Khánh, Đà Nẵng', 300000.000, 'Vũ Thị F', '0902222222', 2),
('KTM03', 'Kho thương mại TP.HCM', 'KCN Tân Bình, TP.HCM', 600000.000, 'Đặng Văn G', '0903333333', 3)
ON CONFLICT (code) DO NOTHING;

-- Nhóm khách hàng
INSERT INTO commercial_customer_groups (code, name, description, credit_limit) VALUES
('DAILY-1', 'Đại lý cấp 1', 'Đại lý lớn, uy tín cao', 200000000),
('DAILY-2', 'Đại lý cấp 2', 'Đại lý trung bình', 100000000),
('CUAHANG', 'Cửa hàng', 'Cửa hàng con (CH10, CH11...)', 50000000),
('VIP', 'Khách hàng VIP', 'Khách hàng doanh nghiệp lớn', 150000000),
('REGULAR', 'Khách hàng thường', 'Khách hàng ổn định', 30000000)
ON CONFLICT (code) DO NOTHING;

-- Khách hàng thương mại (Đại lý, Cửa hàng)
INSERT INTO commercial_customers (code, name, customer_group_id, tax_code, address, phone, contact_person, credit_limit, payment_terms) VALUES
-- Đại lý cấp 1
('DAILY-001', 'Đại lý Hoàng Gia', 1, '1111111111', 'Hà Nội', '0911111111', 'Nguyễn Văn A', 180000000, '60 ngày'),
('DAILY-002', 'Đại lý Thành Đạt', 1, '2222222222', 'TP.HCM', '0922222222', 'Trần Văn B', 200000000, '60 ngày'),
-- Đại lý cấp 2
('DAILY-003', 'Đại lý Tân Phát', 2, '3333333333', 'Đà Nẵng', '0933333333', 'Lê Thị C', 90000000, '45 ngày'),
-- Cửa hàng (như trong báo cáo)
('CH10', 'Cửa hàng số 10', 3, '4444444444', 'Hà Nội', '0944444444', 'Phạm Văn D', 40000000, '30 ngày'),
('CH11', 'Cửa hàng số 11', 3, '5555555555', 'Hà Nội', '0955555555', 'Hoàng Thị E', 35000000, '30 ngày'),
('CH31', 'Cửa hàng số 31', 3, '6666666666', 'TP.HCM', '0966666666', 'Vũ Văn F', 45000000, '30 ngày'),
('CH372', 'Cửa hàng số 372', 3, '7777777777', 'Đà Nẵng', '0977777777', 'Đặng Thị G', 38000000, '30 ngày'),
-- Khách hàng VIP
('VIP-001', 'Công ty TNHH Vận tải Thành Công', 4, '8888888888', 'Hà Nội', '0988888888', 'Ngô Văn H', 150000000, '45 ngày')
ON CONFLICT (code) DO NOTHING;

-- Kì giá
INSERT INTO price_periods (code, name, product_id, region_id, base_price, effective_from, effective_to) VALUES
('E5-01-2026-MB', 'Giá xăng E5 tháng 01/2026 - Miền Bắc', 1, 1, 23500.00, '2026-01-01', '2026-01-31'),
('E5-02-2026-MB', 'Giá xăng E5 tháng 02/2026 - Miền Bắc', 1, 1, 24000.00, '2026-02-01', NULL),
('RON95-01-2026-MB', 'Giá xăng RON95 tháng 01/2026 - Miền Bắc', 2, 1, 24500.00, '2026-01-01', '2026-01-31'),
('DO-01-2026-MB', 'Giá dầu DO tháng 01/2026 - Miền Bắc', 3, 1, 22000.00, '2026-01-01', '2026-01-31'),
('DO-02-2026-MB', 'Giá dầu DO tháng 02/2026 - Miền Bắc', 3, 1, 22500.00, '2026-02-01', NULL)
ON CONFLICT (code) DO NOTHING;

-- Lô hàng nhập mẫu
INSERT INTO import_batches (
    batch_code, warehouse_id, supplier_id, product_id, price_period_id,
    import_quantity, unit_price, discount_percent,
    import_date, import_time, invoice_number, vehicle_number,
    vat_percent, environmental_tax_rate, created_by
) VALUES
-- Kho HN - NCC Petrolimex - E5
('LN-2026-0101', 1, 1, 1, 1, 50000.000, 22000.00, 3.00, '2026-01-05', '08:00:00', 'HD-001', '29A-12345', 10, 2000, 1),
('LN-2026-0102', 1, 1, 1, 1, 30000.000, 22200.00, 2.50, '2026-01-15', '09:00:00', 'HD-002', '29A-67890', 10, 2000, 1),
-- Kho HN - NCC PVN - E5
('LN-2026-0103', 1, 2, 1, 1, 40000.000, 21800.00, 4.00, '2026-01-08', '10:00:00', 'HD-003', '30A-11111', 10, 2000, 1),
-- Kho HN - NCC Petrolimex - Diesel
('LN-2026-0104', 1, 1, 3, 4, 60000.000, 20500.00, 2.00, '2026-01-10', '14:00:00', 'HD-004', '29A-22222', 10, 1500, 1),
('LN-2026-0105', 1, 1, 3, 4, 35000.000, 20800.00, 1.50, '2026-01-20', '11:00:00', 'HD-005', '29A-33333', 10, 1500, 1),
-- Kho HN - NCC PVN - Diesel
('LN-2026-0106', 1, 2, 3, 4, 45000.000, 20300.00, 3.00, '2026-01-12', '15:00:00', 'HD-006', '30A-44444', 10, 1500, 1)
ON CONFLICT (batch_code) DO NOTHING;

-- Số dư công nợ đầu kỳ
INSERT INTO commercial_debt_ledger (customer_id, warehouse_id, ref_type, debit, credit, notes, created_at) VALUES
(1, 1, 'OPENING_BALANCE', 15000000, 0, 'Số dư đầu kỳ 01/01/2026', '2026-01-01 00:00:00'),
(2, 3, 'OPENING_BALANCE', 25000000, 0, 'Số dư đầu kỳ 01/01/2026', '2026-01-01 00:00:00')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- KẾT THÚC - DATABASE SETUP COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ DATABASE BÁN THƯƠNG MẠI ĐÃ ĐƯỢC TẠO THÀNH CÔNG!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CẤU TRÚC DATABASE:';
    RAISE NOTICE '   - Quản lý theo LÔ HÀNG (import_batches)';
    RAISE NOTICE '   - Xuất hàng link đến lô cụ thể (export_order_items -> import_batch_id)';
    RAISE NOTICE '   - Tự động tính toán thuế BVMT, VAT, chiết khấu';
    RAISE NOTICE '   - Tự động cập nhật tồn kho, công nợ qua triggers';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 TÍNH NĂNG CHÍNH:';
    RAISE NOTICE '   ✓ Quản lý nhiều nhà cung cấp/kho';
    RAISE NOTICE '   ✓ Theo dõi từng lô hàng (FIFO/FEFO)';
    RAISE NOTICE '   ✓ Tính thuế BVMT chi tiết';
    RAISE NOTICE '   ✓ Gợi ý lô hàng tối ưu (function suggest_optimal_batches)';
    RAISE NOTICE '   ✓ Báo cáo doanh thu/lợi nhuận theo lô';
    RAISE NOTICE '   ✓ Quản lý công nợ real-time';
    RAISE NOTICE '';
    RAISE NOTICE '📈 VIEWS & FUNCTIONS:';
    RAISE NOTICE '   - v_batch_inventory: Tồn kho chi tiết';
    RAISE NOTICE '   - v_batch_optimization: Gợi ý lô tối ưu';
    RAISE NOTICE '   - v_batch_revenue_report: Doanh thu theo lô';
    RAISE NOTICE '   - v_customer_debt_report: Công nợ khách hàng';
    RAISE NOTICE '   - suggest_optimal_batches(): Tự động gợi ý lô khi xuất';
    RAISE NOTICE '';
    RAISE NOTICE '💡 VÍ DỤ SỬ DỤNG:';
    RAISE NOTICE '   -- Gợi ý xuất 20000 lít E5 từ kho 1 với chiết khấu 3%:';
    RAISE NOTICE '   SELECT * FROM suggest_optimal_batches(1, 1, 20000, 3);';
    RAISE NOTICE '';
    RAISE NOTICE '   -- Xem tồn kho theo lô:';
    RAISE NOTICE '   SELECT * FROM v_batch_inventory WHERE warehouse_code = ''KTM01'';';
    RAISE NOTICE '';
    RAISE NOTICE '   -- Báo cáo doanh thu:';
    RAISE NOTICE '   SELECT * FROM v_batch_revenue_report ORDER BY gross_profit DESC;';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
END $$;
