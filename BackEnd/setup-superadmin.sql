-- Script tạo SUPER_ADMIN role và user
-- Password: SuperAdmin@123

-- 1. Tạo role SUPER_ADMIN
INSERT INTO roles (id, code, name)
VALUES (6, 'SUPER_ADMIN', 'Super Admin')
ON CONFLICT (id) DO UPDATE SET code = 'SUPER_ADMIN', name = 'Super Admin';

-- 2. Tạo user superadmin
INSERT INTO users (username, password_hash, full_name, role_id, store_id, is_active, created_at)
VALUES (
    'superadmin',
    '$2b$10$O4G5SyrA42UZrcQ2MawCGemD4cneLpElF53Rw6ib1LAl2WOktDrW6',
    'Super Administrator',
    6,
    NULL,
    TRUE,
    NOW()
)
ON CONFLICT (username) DO UPDATE SET 
    password_hash = '$2b$10$O4G5SyrA42UZrcQ2MawCGemD4cneLpElF53Rw6ib1LAl2WOktDrW6',
    role_id = 6,
    is_active = TRUE;

-- 3. Cập nhật sequence
SELECT setval('roles_id_seq', GREATEST((SELECT MAX(id) FROM roles), 6));
