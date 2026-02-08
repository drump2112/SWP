-- Thêm cột discount_per_unit vào bảng import_batches
ALTER TABLE import_batches ADD COLUMN discount_per_unit NUMERIC(18,2) DEFAULT 0 NOT NULL;

-- Xóa cột discount_percent cũ nếu muốn
-- ALTER TABLE import_batches DROP COLUMN discount_percent;

-- Chạy câu lệnh này để kiểm tra kết quả
-- SELECT * FROM import_batches LIMIT 1;
