-- Migration: Add SUPER_ADMIN role
-- Date: 2026-01-27
-- Description: Thêm role SUPER_ADMIN với quyền cao nhất trong hệ thống

-- Thêm role SUPER_ADMIN (id = 6 để không conflict với roles hiện tại)
INSERT INTO roles (id, code, name)
VALUES (6, 'SUPER_ADMIN', 'Super Admin')
ON CONFLICT (id) DO NOTHING;

-- Cập nhật sequence nếu cần
SELECT setval('roles_id_seq', GREATEST((SELECT MAX(id) FROM roles), 6));


