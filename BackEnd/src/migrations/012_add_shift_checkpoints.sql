-- Migration: Add shift checkpoints tables for inventory check during shift
-- Created: 2026-01-22
-- Purpose: Allow inventory checkpoint (kiểm kê) during an open shift without closing it

-- ============================================
-- 1. Bảng shift_checkpoints - Mốc kiểm kê trong ca
-- ============================================
CREATE TABLE IF NOT EXISTS shift_checkpoints (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  checkpoint_no INTEGER NOT NULL DEFAULT 1,          -- Số thứ tự checkpoint trong ca (1, 2, 3...)
  checkpoint_at TIMESTAMP NOT NULL,                  -- Thời điểm kiểm kê
  notes TEXT,                                        -- Ghi chú
  created_by INTEGER REFERENCES users(id),           -- Người tạo
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Một ca có thể có nhiều checkpoint, đánh số thứ tự
  CONSTRAINT uq_shift_checkpoint_no UNIQUE (shift_id, checkpoint_no)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_shift_checkpoints_shift_id ON shift_checkpoints(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_checkpoints_at ON shift_checkpoints(checkpoint_at);

COMMENT ON TABLE shift_checkpoints IS 'Mốc kiểm kê trong ca - ghi nhận thời điểm kiểm kê mà không cần chốt ca';
COMMENT ON COLUMN shift_checkpoints.checkpoint_no IS 'Số thứ tự checkpoint trong ca (1, 2, 3...)';
COMMENT ON COLUMN shift_checkpoints.checkpoint_at IS 'Thời điểm thực hiện kiểm kê';

-- ============================================
-- 2. Bảng shift_checkpoint_readings - Số đồng hồ vòi bơm tại checkpoint
-- ============================================
CREATE TABLE IF NOT EXISTS shift_checkpoint_readings (
  id SERIAL PRIMARY KEY,
  checkpoint_id INTEGER NOT NULL REFERENCES shift_checkpoints(id) ON DELETE CASCADE,
  pump_id INTEGER REFERENCES pumps(id),              -- Vòi bơm
  pump_code VARCHAR(50),                             -- Mã vòi (backup)
  product_id INTEGER NOT NULL REFERENCES products(id),
  meter_value DECIMAL(15,2) NOT NULL,                -- Số đồng hồ tại thời điểm kiểm kê
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_checkpoint_readings_checkpoint_id ON shift_checkpoint_readings(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_readings_pump_id ON shift_checkpoint_readings(pump_id);

COMMENT ON TABLE shift_checkpoint_readings IS 'Số đồng hồ vòi bơm ghi nhận tại thời điểm kiểm kê';
COMMENT ON COLUMN shift_checkpoint_readings.meter_value IS 'Số đồng hồ tại thời điểm kiểm kê';

-- ============================================
-- 3. Bảng shift_checkpoint_stocks - Tồn kho thực tế bể tại checkpoint
-- ============================================
CREATE TABLE IF NOT EXISTS shift_checkpoint_stocks (
  id SERIAL PRIMARY KEY,
  checkpoint_id INTEGER NOT NULL REFERENCES shift_checkpoints(id) ON DELETE CASCADE,
  tank_id INTEGER NOT NULL REFERENCES tanks(id),     -- Bể chứa
  product_id INTEGER REFERENCES products(id),        -- Mặt hàng
  system_quantity DECIMAL(15,2),                     -- Tồn hệ thống (tính toán)
  actual_quantity DECIMAL(15,2) NOT NULL,            -- Tồn thực tế (nhập tay)
  difference DECIMAL(15,2) GENERATED ALWAYS AS (actual_quantity - COALESCE(system_quantity, 0)) STORED,
  notes TEXT,                                        -- Ghi chú cho từng bể
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_checkpoint_stocks_checkpoint_id ON shift_checkpoint_stocks(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_stocks_tank_id ON shift_checkpoint_stocks(tank_id);

COMMENT ON TABLE shift_checkpoint_stocks IS 'Tồn kho thực tế bể ghi nhận tại thời điểm kiểm kê';
COMMENT ON COLUMN shift_checkpoint_stocks.system_quantity IS 'Tồn kho hệ thống tính tại thời điểm kiểm kê';
COMMENT ON COLUMN shift_checkpoint_stocks.actual_quantity IS 'Tồn kho thực tế đo được';
COMMENT ON COLUMN shift_checkpoint_stocks.difference IS 'Chênh lệch = Thực tế - Hệ thống (tự động tính)';

-- ============================================
-- Done
-- ============================================
