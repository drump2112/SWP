const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL to insert admin user:');
  console.log(`INSERT INTO users (username, password_hash, full_name, role_id, is_active) VALUES ('admin', '${hash}', 'Administrator', 1, TRUE) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;`);
}

generateHash();
