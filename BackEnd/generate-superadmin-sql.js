const bcrypt = require('bcrypt');
const fs = require('fs');

const password = 'SuperAdmin@123';
const hash = bcrypt.hashSync(password, 10);

const sql = `-- Script tạo SUPER_ADMIN role và user
-- Password: ${password}

-- 1. Tạo role SUPER_ADMIN
INSERT INTO roles (id, code, name)
VALUES (6, 'SUPER_ADMIN', 'Super Admin')
ON CONFLICT (id) DO UPDATE SET code = 'SUPER_ADMIN', name = 'Super Admin';

-- 2. Tạo user superadmin
INSERT INTO users (username, password_hash, full_name, role_id, store_id, is_active, created_at)
VALUES (
    'superadmin',
    '${hash}',
    'Super Administrator',
    6,
    NULL,
    TRUE,
    NOW()
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = '${hash}',
    role_id = 6,
    is_active = TRUE;

-- 3. Cập nhật sequence
SELECT setval('roles_id_seq', GREATEST((SELECT MAX(id) FROM roles), 6));
`;

fs.writeFileSync('setup-superadmin.sql', sql);
console.log('✅ File setup-superadmin.sql đã được tạo');
console.log('');
console.log('Username: superadmin');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('');
console.log('Chạy lệnh sau để tạo superadmin:');
console.log('docker compose exec -T db psql -U postgres -d fuel_management -f /dev/stdin < setup-superadmin.sql');
