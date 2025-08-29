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

async function updateEmployeeEmails() {
  const client = await pool.connect();
  
  try {
    console.log('📧 Updating employee emails for unified login...');
    
    // Get all employees
    const employeesResult = await client.query('SELECT id, employee_id, first_name, last_name, email FROM employees ORDER BY employee_id');
    const employees = employeesResult.rows;
    
    console.log(`Found ${employees.length} employees`);
    
    // Update emails for each employee
    for (const employee of employees) {
      // Create a realistic email based on name and role
      let email;
      
      // Check if employee already has a realistic email
      if (employee.email && employee.email.includes('@')) {
        console.log(`✅ ${employee.employee_id}: ${employee.first_name} ${employee.last_name} - ${employee.email} (already set)`);
        continue;
      }
      
      // Generate email based on employee ID and role
      const firstName = employee.first_name.toLowerCase().replace(/[^a-z]/g, '');
      const lastName = employee.last_name.toLowerCase().replace(/[^a-z]/g, '');
      
      // Different email patterns based on employee ID prefix
      if (employee.employee_id.startsWith('ADM')) {
        email = `admin@rotaclock.com`;
      } else if (employee.employee_id.startsWith('PM')) {
        email = `${firstName}.${lastName}@rotaclock.com`;
      } else if (employee.employee_id.startsWith('TL')) {
        email = `${firstName}.${lastName}@rotaclock.com`;
      } else {
        email = `${firstName}.${lastName}@rotaclock.com`;
      }
      
      await client.query(`
        UPDATE employees 
        SET email = $1 
        WHERE id = $2
      `, [email, employee.id]);
      
      console.log(`✅ ${employee.employee_id}: ${employee.first_name} ${employee.last_name} - ${email}`);
    }
    
    console.log('\n🎉 All employee emails have been updated!');
    console.log('\n📋 Login Credentials for Testing:');
    console.log('Email | Password | Role');
    console.log('------|----------|-----');
    
    // Show some sample credentials
    const sampleEmployees = employees.slice(0, 10);
    sampleEmployees.forEach(emp => {
      const firstName = emp.first_name.toLowerCase().replace(/[^a-z]/g, '');
      const lastName = emp.last_name.toLowerCase().replace(/[^a-z]/g, '');
      let email;
      
      if (emp.employee_id.startsWith('ADM')) {
        email = `admin@rotaclock.com`;
      } else if (emp.employee_id.startsWith('PM')) {
        email = `${firstName}.${lastName}@rotaclock.com`;
      } else if (emp.employee_id.startsWith('TL')) {
        email = `${firstName}.${lastName}@rotaclock.com`;
      } else {
        email = `${firstName}.${lastName}@rotaclock.com`;
      }
      
      const password = `${firstName}123`;
      const role = emp.employee_id.startsWith('ADM') ? 'Admin' : 
                   emp.employee_id.startsWith('PM') ? 'Project Manager' :
                   emp.employee_id.startsWith('TL') ? 'Team Lead' : 'Employee';
      
      console.log(`${email} | ${password} | ${role}`);
    });
    
    console.log('\n🔗 Use the unified login at: /login');
    
  } catch (error) {
    console.error('❌ Error updating employee emails:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
updateEmployeeEmails().catch(console.error);
