const bcrypt = require('bcrypt');

async function generateSuperAdminHash() {
  const password = 'SuperAdmin@123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('========================================');
  console.log('SUPER ADMIN User Creation Script');
  console.log('========================================');
  console.log('Username: superadmin');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\n========================================');
  console.log('SQL Commands to run:');
  console.log('========================================\n');
  
  // Step 1: Add SUPER_ADMIN role
  console.log('-- Step 1: Add SUPER_ADMIN role');
  console.log(`INSERT INTO roles (id, code, name) VALUES (0, 'SUPER_ADMIN', 'Super Administrator') ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;`);
  console.log('');
  
  // Step 2: Create super admin user
  console.log('-- Step 2: Create super admin user');
  console.log(`INSERT INTO users (username, password_hash, full_name, role_id, is_active) VALUES ('superadmin', '${hash}', 'Super Administrator', 0, TRUE) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role_id = 0;`);
  console.log('');
  
  console.log('========================================');
  console.log('Run these SQL commands in your database');
  console.log('========================================');
}

generateSuperAdminHash();
