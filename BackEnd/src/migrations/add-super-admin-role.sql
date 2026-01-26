-- Migration: Add SUPER_ADMIN role
-- Date: 2026-01-26
-- Description: Thêm role SUPER_ADMIN với quyền cao nhất trong hệ thống

-- 1. Thêm role SUPER_ADMIN
INSERT INTO roles (id, code, name) 
VALUES (0, 'SUPER_ADMIN', 'Super Administrator')
ON CONFLICT (code) DO NOTHING;

-- 2. Cập nhật sequence nếu cần (đảm bảo ID 0 không bị trùng)
-- Không cần vì chúng ta dùng ID = 0 cho SUPER_ADMIN

-- 3. Tạo user super admin mặc định (password: SuperAdmin@123)
-- Hash được tạo bằng bcrypt với cost 10
INSERT INTO users (username, password_hash, full_name, role_id, store_id, is_active)
VALUES (
    'superadmin',
    '$2b$10$YourHashedPasswordHere', -- Sẽ được cập nhật bằng script
    'Super Administrator',
    0,
    NULL,
    true
)
ON CONFLICT (username) DO NOTHING;

-- 4. Thêm các permissions đặc biệt cho SUPER_ADMIN (nếu dùng permission-based)
-- INSERT INTO permissions (code, description) VALUES
-- ('MANAGE_ROLES', 'Quản lý roles và permissions'),
-- ('MANAGE_ADMINS', 'Tạo/sửa/xóa admin users'),
-- ('VIEW_AUDIT_LOGS', 'Xem tất cả audit logs'),
-- ('SYSTEM_BACKUP', 'Backup/restore database'),
-- ('DELETE_ANY_DATA', 'Xóa bất kỳ dữ liệu nào')
-- ON CONFLICT (code) DO NOTHING;

-- Gán tất cả permissions cho SUPER_ADMIN
-- INSERT INTO role_permissions (role_id, permission_id)
-- SELECT 0, id FROM permissions
-- ON CONFLICT DO NOTHING;

COMMIT;
