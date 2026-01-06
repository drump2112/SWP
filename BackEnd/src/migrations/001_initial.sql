
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
