const { Pool } = require('pg');

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

// Use the same hashing method as the application
function hashPassword(password) {
  return Buffer.from(password).toString('base64');
}

// Use the same verification method as the application
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

async function testAuthentication() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing employee authentication...\n');
    
    // Test multiple employees
    const testCases = [
      { employeeId: 'EMP001', password: 'john123', name: 'John Doe' },
      { employeeId: 'EMP002', password: 'jane123', name: 'Jane Smith' },
      { employeeId: 'EMP003', password: 'mike123', name: 'Mike Johnson' },
      { employeeId: 'EMP015', password: 'usama123', name: 'Usama Puri' },
    ];
    
    for (const testCase of testCases) {
      console.log(`Testing ${testCase.name} (${testCase.employeeId})...`);
      
      // Get employee from database
      const result = await client.query(`
        SELECT id, employee_id, first_name, last_name, password_hash, is_active 
        FROM employees 
        WHERE employee_id = $1
      `, [testCase.employeeId]);
      
      if (result.rows.length === 0) {
        console.log(`   ❌ Employee not found`);
        continue;
      }
      
      const employee = result.rows[0];
      
      // Test authentication
      const isValid = verifyPassword(testCase.password, employee.password_hash);
      
      console.log(`   Employee: ${employee.first_name} ${employee.last_name}`);
      console.log(`   Active: ${employee.is_active ? '✅ Yes' : '❌ No'}`);
      console.log(`   Password valid: ${isValid ? '✅ Yes' : '❌ No'}`);
      console.log(`   Login should work: ${isValid && employee.is_active ? '✅ Yes' : '❌ No'}`);
      console.log('');
    }
    
    console.log('🎉 Authentication test completed!');
    console.log('\n📋 Ready to login with any of these credentials:');
    testCases.forEach(test => {
      console.log(`   ${test.employeeId} | ${test.password} (${test.name})`);
    });
    
  } catch (error) {
    console.error('Error testing authentication:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testAuthentication().catch(console.error);
