const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'SuperAdmin@123';
  const hash = await bcrypt.hash(password, 10);
  console.log('=== SUPER ADMIN CREDENTIALS ===');
  console.log('Username: superadmin');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\n=== SQL to insert SUPER_ADMIN user ===');
  console.log(`
-- Đảm bảo role SUPER_ADMIN tồn tại
INSERT INTO roles (id, code, name)
VALUES (6, 'SUPER_ADMIN', 'Super Admin')
ON CONFLICT (id) DO NOTHING;

-- Tạo user superadmin
INSERT INTO users (username, password_hash, full_name, role_id, store_id, is_active, created_at)
VALUES ('superadmin', '${hash}', 'Super Administrator', 6, NULL, TRUE, NOW())
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role_id = 6;
  `);
}

generateHash();
