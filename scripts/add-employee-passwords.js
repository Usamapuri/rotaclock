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

async function addEmployeePasswords() {
  const client = await pool.connect();
  
  try {
    console.log('Adding passwords to employees...');
    
    // Get all employees
    const employeesResult = await client.query('SELECT id, employee_id, first_name, last_name FROM employees');
    const employees = employeesResult.rows;
    
    console.log(`Found ${employees.length} employees`);
    
    // Add passwords for each employee
    for (const employee of employees) {
      // Create a simple password: first name + "123" (lowercase)
      const password = employee.first_name.toLowerCase() + '123';
      const passwordHash = await bcrypt.hash(password, 10);
      
      await client.query(`
        UPDATE employees 
        SET password_hash = $1 
        WHERE id = $2
      `, [passwordHash, employee.id]);
      
      console.log(`Added password for ${employee.first_name} ${employee.last_name} (${employee.employee_id}): ${password}`);
    }
    
    console.log('\n✅ All employee passwords have been set!');
    console.log('\n📋 Login Credentials:');
    console.log('Employee ID | Password');
    console.log('------------|---------');
    employees.forEach(emp => {
      const password = emp.first_name.toLowerCase() + '123';
      console.log(`${emp.employee_id} | ${password}`);
    });
    
  } catch (error) {
    console.error('Error adding passwords:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
addEmployeePasswords().catch(console.error);
