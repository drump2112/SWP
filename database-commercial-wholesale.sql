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
-- 5. KÌ GIÁ - SỬ DỤNG LẠI BẢNG product_prices TỪ HỆ THỐNG BÁN LẺ
-- ============================================================================
-- KHÔNG TẠO BẢNG MỚI - Tận dụng bảng product_prices đã có
-- Cấu trúc bảng product_prices:
--   - id, product_id, region_id
--   - price (giá bán)
--   - valid_from, valid_to (khoảng thời gian hiệu lực)
--   - created_at
-- => Kì giá CHUNG cho cả bán lẻ và thương mại

COMMENT ON TABLE product_prices IS 'Kì giá sản phẩm - DÙNG CHUNG cho bán lẻ và thương mại';

-- ============================================================================
-- 6. LÔ HÀNG NHẬP - IMPORT BATCHES (CORE TABLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_batches (
    id SERIAL PRIMARY KEY,
    batch_code VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id INTEGER NOT NULL REFERENCES commercial_warehouses(id),
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    price_at_import NUMERIC(18,2), -- Giá thị trường tại thời điểm nhập (tham khảo)

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
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_remaining_not_negative CHECK (remaining_quantity >= 0),
    CONSTRAINT chk_quantities_valid CHECK (exported_quantity >= 0 AND import_quantity >= 0)
);

-- Indexes cho hiệu suất cao
CREATE INDEX idx_import_batches_warehouse ON import_batches(warehouse_id);
CREATE INDEX idx_import_batches_supplier ON import_batches(supplier_id);
CREATE INDEX idx_import_batches_product ON import_batches(product_id);
CREATE INDEX idx_import_batches_date ON import_batches(import_date);
CREATE INDEX idx_import_batches_status ON import_batches(status);
CREATE INDEX idx_import_batches_remaining ON import_batches(warehouse_id, product_id, supplier_id, remaining_quantity)
    WHERE remaining_quantity > 0;
CREATE INDEX idx_import_batches_lookup ON import_batches(warehouse_id, product_id, supplier_id, status)
    WHERE status = 'ACTIVE' AND remaining_quantity > 0;

COMMENT ON TABLE import_batches IS 'Lô hàng nhập - quản lý tồn kho theo batch (FIFO/FEFO). SERVICE LAYER tính toán các trường: discount_amount, final_unit_price, subtotal, vat_amount, environmental_tax_amount, total_amount';
COMMENT ON COLUMN import_batches.remaining_quantity IS 'Số lượng còn lại - TỰ ĐỘNG cập nhật bởi trigger khi xuất hàng';
COMMENT ON COLUMN import_batches.status IS 'ACTIVE: còn hàng, DEPLETED: hết hàng, CANCELLED: hủy - TỰ ĐỘNG cập nhật bởi trigger';

-- ============================================================================
-- 7. ĐơN XUẤT HÀNG - EXPORT ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS export_orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id INTEGER NOT NULL REFERENCES commercial_warehouses(id),

    -- Thông tin đơn hàng (xe bồn - giao cho nhiều khách hàng)
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
CREATE INDEX idx_export_orders_date ON export_orders(order_date);
CREATE INDEX idx_export_orders_status ON export_orders(status);
CREATE INDEX idx_export_orders_payment ON export_orders(payment_status);

COMMENT ON TABLE export_orders IS 'Đơn xuất hàng thương mại - một chuyến xe bồn có thể giao cho nhiều khách hàng';
COMMENT ON COLUMN export_orders.vehicle_number IS 'Biển số xe bồn giao hàng';
COMMENT ON COLUMN export_orders.total_environmental_tax IS 'Tổng thuế bảo vệ môi trường';

-- ============================================================================
-- 8. CHI TIẾT ĐƠN XUẤT THEO LÔ - EXPORT ORDER ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS export_order_items (
    id SERIAL PRIMARY KEY,
    export_order_id INTEGER NOT NULL REFERENCES export_orders(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES commercial_customers(id),
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
CREATE INDEX idx_export_items_customer ON export_order_items(customer_id);
CREATE INDEX idx_export_items_batch ON export_order_items(import_batch_id);
CREATE INDEX idx_export_items_product ON export_order_items(product_id);

COMMENT ON TABLE export_order_items IS 'Chi tiết đơn xuất - mỗi dòng có customer_id riêng (xe bồn giao nhiều khách), link đến 1 lô nhập cụ thể. SERVICE LAYER tính toán: subtotal, discount_amount, vat_amount, environmental_tax_amount, total_amount, profit_amount';
COMMENT ON COLUMN export_order_items.customer_id IS 'Khách hàng nhận hàng của dòng này - một đơn có thể giao cho nhiều khách';
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
-- LƯU Ý: Logic tính toán (subtotal, discount, VAT...) LÀM Ở SERVICE LAYER
-- Triggers chỉ xử lý DATA INTEGRITY: tồn kho, công nợ, status
-- ============================================================================

-- Trigger 1: Cập nhật tổng hợp tồn kho khi nhập hàng
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
    BEFORE INSERT ON import_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_import();

-- Trigger 2: Cập nhật tổng đơn xuất khi thêm/sửa/xóa chi tiết (GIỮ)
-- LưU ý: Service đã tính total_amount của từng item, trigger này chỉ tổng hợp
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

-- Trigger 3: Cập nhật remaining_quantity và status khi xuất hàng (GIỮ - QUAN TRỌNG)
CREATE OR REPLACE FUNCTION update_batch_on_export()
RETURNS TRIGGER AS $$
DECLARE
    qty_diff NUMERIC(18,3);
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Thêm mới: Trừ tồn kho
        UPDATE import_batches SET
            remaining_quantity = remaining_quantity - NEW.quantity,
            exported_quantity = exported_quantity + NEW.quantity,
            status = CASE
                WHEN remaining_quantity - NEW.quantity <= 0 THEN 'DEPLETED'
                ELSE 'ACTIVE'
            END,
            updated_at = NOW()
        WHERE id = NEW.import_batch_id;

        -- Kiểm tra có đủ hàng không
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Lô hàng không tồn tại: %', NEW.import_batch_id;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Sửa: Hoàn trả số cũ, trừ số mới
        qty_diff := NEW.quantity - OLD.quantity;

        -- Nếu đổi lô hàng
        IF NEW.import_batch_id != OLD.import_batch_id THEN
            -- Hoàn trả lô cũ
            UPDATE import_batches SET
                remaining_quantity = remaining_quantity + OLD.quantity,
                exported_quantity = exported_quantity - OLD.quantity,
                status = 'ACTIVE',
                updated_at = NOW()
            WHERE id = OLD.import_batch_id;

            -- Trừ từ lô mới
            UPDATE import_batches SET
                remaining_quantity = remaining_quantity - NEW.quantity,
                exported_quantity = exported_quantity + NEW.quantity,
                status = CASE
                    WHEN remaining_quantity - NEW.quantity <= 0 THEN 'DEPLETED'
                    ELSE 'ACTIVE'
                END,
                updated_at = NOW()
            WHERE id = NEW.import_batch_id;
        ELSE
            -- Cùng lô: Chỉ điều chỉnh số lượng
            UPDATE import_batches SET
                remaining_quantity = remaining_quantity - qty_diff,
                exported_quantity = exported_quantity + qty_diff,
                status = CASE
                    WHEN remaining_quantity - qty_diff <= 0 THEN 'DEPLETED'
                    ELSE 'ACTIVE'
                END,
                updated_at = NOW()
            WHERE id = NEW.import_batch_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        -- Xóa: Hoàn trả toàn bộ
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

-- Trigger 4: Cập nhật công nợ khách hàng (GIỮ - QUAN TRỌNG)
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
    COALESCE(pp.price, ib.final_unit_price * 1.1) AS current_market_price, -- Lấy từ product_prices
    -- Tính lợi nhuận tiềm năng
    (COALESCE(pp.price, ib.final_unit_price * 1.1) - ib.final_unit_price) AS unit_profit,
    (COALESCE(pp.price, ib.final_unit_price * 1.1) - ib.final_unit_price) * ib.remaining_quantity AS total_potential_profit,
    -- % lợi nhuận
    ROUND(((COALESCE(pp.price, ib.final_unit_price * 1.1) - ib.final_unit_price) / ib.final_unit_price * 100), 2) AS profit_margin_percent,
    ib.import_date,
    CURRENT_DATE - ib.import_date AS age_days,
    -- Điểm ưu tiên (càng cao càng nên xuất trước)
    -- = lợi nhuận % * 0.7 + (tuổi lô / 365) * 0.3
    ROUND(
        (((COALESCE(pp.price, ib.final_unit_price * 1.1) - ib.final_unit_price) / ib.final_unit_price * 100) * 0.7) +
        ((CURRENT_DATE - ib.import_date) / 365.0 * 100 * 0.3),
        2
    ) AS priority_score
FROM import_batches ib
JOIN commercial_warehouses w ON ib.warehouse_id = w.id
JOIN suppliers s ON ib.supplier_id = s.id
JOIN products p ON ib.product_id = p.id
LEFT JOIN product_prices pp ON pp.product_id = ib.product_id
    AND pp.region_id = w.region_id
    AND pp.valid_from <= NOW()
    AND (pp.valid_to IS NULL OR pp.valid_to >= NOW())
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
-- 15. FUNCTION - NHẬP TỒN ĐẦU KỲ
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_opening_balance(
    p_warehouse_id INTEGER,
    p_supplier_id INTEGER,
    p_product_id INTEGER,
    p_quantity NUMERIC(18,3),
    p_unit_cost NUMERIC(18,2),
    p_opening_date DATE DEFAULT CURRENT_DATE,
    p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_batch_id INTEGER;
    v_batch_code VARCHAR(50);
BEGIN
    -- Tạo mã lô tồn đầu
    v_batch_code := 'OPENING-' || p_warehouse_id || '-' || p_product_id || '-' || p_supplier_id;

    -- Kiểm tra đã có tồn đầu chưa
    SELECT id INTO v_batch_id
    FROM import_batches
    WHERE batch_code = v_batch_code;

    IF FOUND THEN
        -- Đã có -> Cập nhật
        UPDATE import_batches SET
            import_quantity = p_quantity,
            remaining_quantity = p_quantity,
            unit_price = p_unit_cost,
            final_unit_price = p_unit_cost,
            subtotal = p_quantity * p_unit_cost,
            total_amount = p_quantity * p_unit_cost,
            notes = COALESCE(p_notes, 'Tồn đầu kỳ - Cập nhật'),
            updated_at = NOW()
        WHERE id = v_batch_id;

        RAISE NOTICE 'Cập nhật tồn đầu kỳ: Kho %, NCC %, SP %, SL: %',
            p_warehouse_id, p_supplier_id, p_product_id, p_quantity;
    ELSE
        -- Chưa có -> Thêm mới
        INSERT INTO import_batches (
            batch_code, warehouse_id, supplier_id, product_id,
            import_quantity, remaining_quantity, exported_quantity,
            unit_price, discount_percent, discount_amount, final_unit_price,
            import_date, import_time,
            vat_percent, vat_amount,
            environmental_tax_rate, environmental_tax_amount,
            subtotal, total_amount,
            status, notes
        ) VALUES (
            v_batch_code, p_warehouse_id, p_supplier_id, p_product_id,
            p_quantity, p_quantity, 0,
            p_unit_cost, 0, 0, p_unit_cost,
            p_opening_date, '00:00:00',
            0, 0,
            0, 0,
            p_quantity * p_unit_cost, p_quantity * p_unit_cost,
            'ACTIVE', COALESCE(p_notes, 'Tồn đầu kỳ')
        ) RETURNING id INTO v_batch_id;

        RAISE NOTICE 'Thêm tồn đầu kỳ: Kho %, NCC %, SP %, SL: %',
            p_warehouse_id, p_supplier_id, p_product_id, p_quantity;
    END IF;

    RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION insert_opening_balance IS 'Nhập tồn đầu kỳ khi bắt đầu sử dụng hệ thống. Nếu đã có sẽ cập nhật, chưa có sẽ thêm mới';

-- ============================================================================
-- 16. FUNCTION - KIỂM TRA VÀ LẤY THÔNG TIN TỒN KHO
-- ============================================================================

-- Function: Kiểm tra đủ hàng trước khi xuất
CREATE OR REPLACE FUNCTION check_stock_available(
    p_batch_id INTEGER,
    p_quantity NUMERIC(18,3)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_remaining NUMERIC(18,3);
BEGIN
    SELECT remaining_quantity INTO v_remaining
    FROM import_batches
    WHERE id = p_batch_id AND status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lô hàng không tồn tại hoặc đã hết: %', p_batch_id;
    END IF;

    IF v_remaining < p_quantity THEN
        RAISE EXCEPTION 'Không đủ hàng. Còn lại: % lít, xuất: % lít', v_remaining, p_quantity;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Lấy tồn kho hiện tại
CREATE OR REPLACE FUNCTION get_current_stock(
    p_warehouse_id INTEGER,
    p_product_id INTEGER,
    p_supplier_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    supplier_id INTEGER,
    supplier_name VARCHAR(255),
    total_quantity NUMERIC(18,3),
    total_batches INTEGER,
    total_value NUMERIC(18,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        COALESCE(SUM(ib.remaining_quantity), 0),
        COUNT(ib.id)::INTEGER,
        COALESCE(SUM(ib.remaining_quantity * ib.final_unit_price), 0)
    FROM suppliers s
    LEFT JOIN import_batches ib ON ib.supplier_id = s.id
        AND ib.warehouse_id = p_warehouse_id
        AND ib.product_id = p_product_id
        AND ib.status = 'ACTIVE'
        AND ib.remaining_quantity > 0
    WHERE (p_supplier_id IS NULL OR s.id = p_supplier_id)
    GROUP BY s.id, s.name
    HAVING COALESCE(SUM(ib.remaining_quantity), 0) > 0
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_stock_available IS 'Kiểm tra đủ hàng trước khi xuất - throw exception nếu không đủ';
COMMENT ON FUNCTION get_current_stock IS 'Lấy tồn kho hiện tại theo kho, sản phẩm, nhà cung cấp';

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
    RAISE NOTICE '   - 10 Tables: suppliers, warehouses, customer_groups, customers,';
    RAISE NOTICE '     import_batches, export_orders, export_order_items,';
    RAISE NOTICE '     debt_ledger, debt_payments, inventory_summary';
    RAISE NOTICE '   - 4 Triggers: inventory, export totals, batch export, customer debt';
    RAISE NOTICE '   - 8 Functions: 4 triggers + 4 helpers';
    RAISE NOTICE '   - 4 Views: batch inventory, optimization, revenue, debt reports';
    RAISE NOTICE '   - 34+ Indexes for performance';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  LOGIC TÍNH TOÁN:';
    RAISE NOTICE '   🔴 SERVICE LAYER tính: discount, final_price, subtotal, VAT, env_tax, total';
    RAISE NOTICE '   🟢 TRIGGERS xử lý: remaining_qty, status, current_debt, summaries';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 TÍNH NĂNG:';
    RAISE NOTICE '   ✓ Quản lý nhiều nhà cung cấp/kho';
    RAISE NOTICE '   ✓ Theo dõi từng lô hàng (FIFO/FEFO)';
    RAISE NOTICE '   ✓ Gợi ý lô tối ưu (suggest_optimal_batches)';
    RAISE NOTICE '   ✓ Báo cáo doanh thu/lợi nhuận theo lô';
    RAISE NOTICE '   ✓ Quản lý công nợ real-time';
    RAISE NOTICE '   ✓ Truy xuất nguồn gốc (batch traceability)';
    RAISE NOTICE '';
    RAISE NOTICE '💡 VÍ DỤ:';
    RAISE NOTICE '   SELECT insert_opening_balance(wh_id, supplier_id, prod_id, qty, cost);';
    RAISE NOTICE '   SELECT * FROM get_current_stock(wh_id, prod_id);';
    RAISE NOTICE '   SELECT * FROM suggest_optimal_batches(wh_id, prod_id, qty, discount);';
    RAISE NOTICE '   SELECT check_stock_available(batch_id, qty);';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
END $$;

