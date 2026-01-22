-- Migration: Add inventory_closing table for period closing
-- Date: 2026-01-22

-- Tạo bảng chốt tồn kho
CREATE TABLE IF NOT EXISTS inventory_closing (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    tank_id INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,

    -- Thông tin kỳ chốt
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    closing_date TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Số liệu chốt
    opening_balance DECIMAL(15,3) NOT NULL,
    import_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    export_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    loss_rate DECIMAL(10,6) NOT NULL DEFAULT 0,
    loss_amount DECIMAL(15,3) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(15,3) NOT NULL,

    -- Liên kết với cấu hình hao hụt
    loss_config_id INTEGER REFERENCES store_loss_config(id),
    product_category VARCHAR(20),

    -- Metadata
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraint: Mỗi bể chỉ có 1 lần chốt cho mỗi kỳ
    UNIQUE(store_id, tank_id, period_from, period_to)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_closing_store_id ON inventory_closing(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_closing_tank_id ON inventory_closing(tank_id);
CREATE INDEX IF NOT EXISTS idx_inventory_closing_period ON inventory_closing(store_id, period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_inventory_closing_tank_period ON inventory_closing(tank_id, period_to DESC);

-- Comments
COMMENT ON TABLE inventory_closing IS 'Bảng lưu trữ số liệu chốt tồn kho theo kỳ';
COMMENT ON COLUMN inventory_closing.period_from IS 'Ngày bắt đầu kỳ chốt';
COMMENT ON COLUMN inventory_closing.period_to IS 'Ngày kết thúc kỳ chốt';
COMMENT ON COLUMN inventory_closing.closing_date IS 'Thời điểm thực hiện chốt';
COMMENT ON COLUMN inventory_closing.opening_balance IS 'Tồn đầu kỳ (từ kỳ trước hoặc current_stock)';
COMMENT ON COLUMN inventory_closing.closing_balance IS 'Tồn sau hao hụt = đầu + nhập - xuất - hao hụt';
COMMENT ON COLUMN inventory_closing.loss_rate IS 'Hệ số hao hụt áp dụng (VD: 0.0025 = 0.25%)';
COMMENT ON COLUMN inventory_closing.loss_amount IS 'Lượng hao hụt = xuất × hệ số';
