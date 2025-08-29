const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Create a connection pool
const pool = new Pool({
  host: 'maglev.proxy.rlwy.net',
  port: 36050,
  database: 'railway',
  user: 'postgres',
  password: 'tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz',
  ssl: {
    rejectUnauthorized: false
  }
});

function verifyPassword(password, hash) {
  if (!password || !hash) return false
  try {
    return bcrypt.compareSync(password, hash)
  } catch {
    // Fallback for legacy base64 hashes
    return Buffer.from(password).toString('base64') === hash
  }
}

async function checkAdminPassword() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking admin user password...');
    
    // Get admin user
    const result = await client.query(`
      SELECT id, employee_id, first_name, last_name, email, password_hash, role 
      FROM employees 
      WHERE employee_id = 'ADM001' OR email = 'admin@rotaclock.com'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }
    
    const admin = result.rows[0];
    console.log('✅ Admin user found:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Employee ID: ${admin.employee_id}`);
    console.log(`   Name: ${admin.first_name} ${admin.last_name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Has password hash: ${admin.password_hash ? 'Yes' : 'No'}`);
    
    if (admin.password_hash) {
      console.log(`   Password hash: ${admin.password_hash.substring(0, 20)}...`);
      
      // Test password verification
      const testPassword = 'admin123';
      const isMatch = verifyPassword(testPassword, admin.password_hash);
      console.log(`   Password '${testPassword}' matches: ${isMatch ? '✅ YES' : '❌ NO'}`);
      
      // Test with bcrypt directly
      try {
        const bcryptMatch = bcrypt.compareSync(testPassword, admin.password_hash);
        console.log(`   Bcrypt direct match: ${bcryptMatch ? '✅ YES' : '❌ NO'}`);
      } catch (error) {
        console.log(`   Bcrypt error: ${error.message}`);
      }
      
      // Test base64 fallback
      const base64Hash = Buffer.from(testPassword).toString('base64');
      const base64Match = base64Hash === admin.password_hash;
      console.log(`   Base64 fallback match: ${base64Match ? '✅ YES' : '❌ NO'}`);
      
    } else {
      console.log('❌ Admin user has no password hash');
    }
    
    // Check all users with admin role
    console.log('\n🔍 Checking all admin users:');
    const adminUsers = await client.query(`
      SELECT employee_id, first_name, last_name, email, role, password_hash 
      FROM employees 
      WHERE role = 'admin' OR employee_id LIKE 'ADM%'
    `);
    
    adminUsers.rows.forEach(user => {
      console.log(`   ${user.employee_id}: ${user.first_name} ${user.last_name} (${user.email}) - Has password: ${user.password_hash ? 'Yes' : 'No'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking admin password:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
checkAdminPassword().catch(console.error);
