const { Pool } = require('pg');

// Database configuration - matching the Railway database used in the app
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

const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Simple password hash function (same as in database.ts)
function hashPassword(password) {
  return Buffer.from(password).toString('base64');
}

// Verify password function (same as in database.ts)
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

const testAuthentication = async () => {
  try {
    console.log('🔐 Testing employee authentication...');
    
    // Test 1: Check if employees exist
    console.log('\n1. Checking employees in database...');
    const employeesResult = await query('SELECT id, employee_id, first_name, last_name, password_hash FROM employees LIMIT 5;');
    
    if (employeesResult.rows.length === 0) {
      console.log('❌ No employees found in database');
      return;
    }
    
    console.log('✅ Employees found:', employeesResult.rows.length);
    employeesResult.rows.forEach(emp => {
      console.log(`   - ${emp.employee_id}: ${emp.first_name} ${emp.last_name} (has password: ${emp.password_hash ? 'yes' : 'no'})`);
    });
    
    // Test 2: Test authentication with first employee
    const testEmployee = employeesResult.rows[0];
    console.log(`\n2. Testing authentication for ${testEmployee.employee_id}...`);
    
    if (!testEmployee.password_hash) {
      console.log('❌ Employee has no password hash');
      return;
    }
    
    // Test with a simple password
    const testPassword = 'john123'; // Updated to match the stored hash
    const hashedPassword = hashPassword(testPassword);
    console.log(`   Test password: ${testPassword}`);
    console.log(`   Hashed password: ${hashedPassword}`);
    console.log(`   Stored hash: ${testEmployee.password_hash}`);
    
    const isMatch = verifyPassword(testPassword, testEmployee.password_hash);
    console.log(`   Password match: ${isMatch ? '✅ YES' : '❌ NO'}`);
    
    // Test 3: Try to authenticate using the database function
    console.log('\n3. Testing database authentication function...');
    const authResult = await query(`
      SELECT * FROM employees 
      WHERE employee_id = $1 AND is_active = true
    `, [testEmployee.employee_id]);
    
    if (authResult.rows.length === 0) {
      console.log('❌ Employee not found or not active');
      return;
    }
    
    const employee = authResult.rows[0];
    console.log(`   Employee found: ${employee.first_name} ${employee.last_name}`);
    console.log(`   Has password hash: ${employee.password_hash ? 'yes' : 'no'}`);
    
    if (employee.password_hash && verifyPassword(testPassword, employee.password_hash)) {
      console.log('✅ Authentication successful!');
      console.log('   You can login with:');
      console.log(`   Employee ID: ${employee.employee_id}`);
      console.log(`   Password: ${testPassword}`);
    } else {
      console.log('❌ Authentication failed');
      console.log('   Possible issues:');
      console.log('   - Password hash is missing');
      console.log('   - Password hash format is incorrect');
      console.log('   - Test password is wrong');
    }
    
  } catch (error) {
    console.error('❌ Error testing authentication:', error);
  } finally {
    await pool.end();
  }
};

testAuthentication();
