-- Tạo user với role STORE cho cửa hàng
-- Password: store123
-- Hash được tạo bằng bcrypt với salt 10

-- Lấy ID của role STORE
DO $$
DECLARE
  store_role_id INT;
  store_id_var INT;
BEGIN
  -- Lấy role STORE ID
  SELECT id INTO store_role_id FROM roles WHERE code = 'STORE' LIMIT 1;

  -- Lấy store đầu tiên (hoặc tạo mới nếu chưa có)
  SELECT id INTO store_id_var FROM stores LIMIT 1;

  IF store_id_var IS NULL THEN
    -- Tạo cửa hàng mẫu nếu chưa có
    INSERT INTO stores (code, name, address, phone, region_id, is_active)
    VALUES ('CH001', 'Cửa hàng Hà Nội', '123 Đường ABC, Hà Nội', '0123456789', 1, TRUE)
    RETURNING id INTO store_id_var;
  END IF;

  -- Tạo user STORE
  INSERT INTO users (username, password_hash, full_name, role_id, store_id, is_active)
  VALUES (
    'store1',
    '$2b$10$XqZ5JhYvmxP3N6kW8tQhVOGKmYn7F8vLZ9pRX2qB.hNwE3mK5cT9e',
    'Quản lý CH Hà Nội',
    store_role_id,
    store_id_var,
    TRUE
  )
  ON CONFLICT (username) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      store_id = EXCLUDED.store_id;

  RAISE NOTICE 'Created user: store1 / store123 for store ID %', store_id_var;
END $$;
