-- Migration: Add store_loss_config table and category column to products
-- Date: 2026-01-22

-- 1. Thêm cột category vào bảng products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'GASOLINE';

-- 2. Cập nhật category cho các sản phẩm dầu (dựa trên tên/mã)
UPDATE products SET category = 'DIESEL'
WHERE LOWER(name) LIKE '%dầu%'
   OR LOWER(name) LIKE '%do %'
   OR LOWER(name) LIKE '%diesel%'
   OR LOWER(code) LIKE '%do%';

-- 3. Tạo bảng store_loss_config
CREATE TABLE IF NOT EXISTS store_loss_config (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_category VARCHAR(20) NOT NULL, -- 'GASOLINE' hoặc 'DIESEL'
    loss_rate DECIMAL(10,6) NOT NULL, -- 0.0025 = 0.25%
    effective_from DATE NOT NULL,
    effective_to DATE, -- NULL = đang áp dụng
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(store_id, product_category, effective_from)
);

-- 4. Tạo index
CREATE INDEX IF NOT EXISTS idx_store_loss_config_store_id ON store_loss_config(store_id);
CREATE INDEX IF NOT EXISTS idx_store_loss_config_effective ON store_loss_config(store_id, product_category, effective_from);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 5. Thêm comment
COMMENT ON TABLE store_loss_config IS 'Cấu hình hệ số hao hụt theo cửa hàng và loại sản phẩm';
COMMENT ON COLUMN store_loss_config.product_category IS 'GASOLINE = Xăng, DIESEL = Dầu';
COMMENT ON COLUMN store_loss_config.loss_rate IS 'Hệ số hao hụt, ví dụ 0.0025 = 0.25%';
COMMENT ON COLUMN store_loss_config.effective_from IS 'Ngày bắt đầu áp dụng hệ số';
COMMENT ON COLUMN store_loss_config.effective_to IS 'Ngày kết thúc, NULL = đang áp dụng';
