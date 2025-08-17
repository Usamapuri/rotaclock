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

async function debugJamesTaylor() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging james.taylor@rotacloud.com...');
    
    const email = 'james.taylor@rotacloud.com';
    
    // 1. Check if employee exists
    console.log('\n1️⃣ Checking if employee exists...');
    const employeeResult = await client.query(`
      SELECT id, employee_id, first_name, last_name, email, role, is_active
      FROM employees 
      WHERE email = $1
    `, [email]);
    
    if (employeeResult.rows.length === 0) {
      console.log('❌ Employee not found in database');
      console.log('   This explains the verification failure!');
      
      // Check what employees exist
      console.log('\n📋 Available employees:');
      const allEmployees = await client.query(`
        SELECT employee_id, first_name, last_name, email, role
        FROM employees 
        WHERE is_active = true
        ORDER BY email
      `);
      
      allEmployees.rows.forEach(emp => {
        console.log(`   ${emp.email} (${emp.employee_id}) - ${emp.first_name} ${emp.last_name} - ${emp.role}`);
      });
      
      return;
    }
    
    const employee = employeeResult.rows[0];
    console.log('✅ Employee found:');
    console.log(`   ID: ${employee.id}`);
    console.log(`   Employee ID: ${employee.employee_id}`);
    console.log(`   Name: ${employee.first_name} ${employee.last_name}`);
    console.log(`   Email: ${employee.email}`);
    console.log(`   Role: ${employee.role}`);
    console.log(`   Active: ${employee.is_active}`);
    
    // 2. Check if employee is already clocked in
    console.log('\n2️⃣ Checking clock-in status...');
    const clockedInResult = await client.query(`
      SELECT sl.id, sl.status, sl.clock_in_time
      FROM shift_logs sl
      JOIN employees e ON sl.employee_id = e.id
      WHERE e.email = $1 
      AND sl.status = 'active'
    `, [email]);
    
    console.log(`   Clocked in: ${clockedInResult.rows.length > 0 ? 'Yes' : 'No'}`);
    if (clockedInResult.rows.length > 0) {
      console.log('   Active shift log:', clockedInResult.rows[0]);
    }
    
    // 3. Check today's shift assignments
    console.log('\n3️⃣ Checking today\'s shift assignments...');
    const today = new Date().toISOString().split('T')[0];
    const shiftAssignmentsResult = await client.query(`
      SELECT 
        sa.*,
        s.name as shift_name,
        s.start_time as shift_start_time,
        s.end_time as shift_end_time
      FROM shift_assignments sa
      LEFT JOIN employees e ON sa.employee_id = e.id
      LEFT JOIN shifts s ON sa.shift_id = s.id
      WHERE sa.date = $1 AND e.email = $2
    `, [today, email]);
    
    console.log(`   Found ${shiftAssignmentsResult.rows.length} shift assignments for today`);
    shiftAssignmentsResult.rows.forEach((assignment, index) => {
      console.log(`   Assignment ${index + 1}: ${assignment.shift_name} (${assignment.shift_start_time} - ${assignment.shift_end_time}) - Status: ${assignment.status}`);
    });
    
    // 4. Test the email-based functions
    console.log('\n4️⃣ Testing email-based functions...');
    
    // Test getEmployeeByEmail
    const employeeByEmail = await client.query(`
      SELECT * FROM employees WHERE email = $1 AND is_active = true
    `, [email]);
    console.log(`   getEmployeeByEmail: ${employeeByEmail.rows.length > 0 ? '✅ Found' : '❌ Not found'}`);
    
    // Test isEmployeeClockedInByEmail
    const isClockedInByEmail = await client.query(`
      SELECT sl.id FROM shift_logs sl
      JOIN employees e ON sl.employee_id = e.id
      WHERE e.email = $1 
      AND sl.status = 'active'
    `, [email]);
    console.log(`   isEmployeeClockedInByEmail: ${isClockedInByEmail.rows.length > 0 ? '✅ Clocked in' : '❌ Not clocked in'}`);
    
    // Test getShiftAssignmentsByEmail
    const shiftAssignmentsByEmail = await client.query(`
      SELECT 
        sa.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.email as employee_email,
        s.name as shift_name,
        s.start_time as shift_start_time,
        s.end_time as shift_end_time
      FROM shift_assignments sa
      LEFT JOIN employees e ON sa.employee_id = e.id
      LEFT JOIN shifts s ON sa.shift_id = s.id
      WHERE sa.date >= $1 AND sa.date <= $2 AND e.email = $3
      ORDER BY sa.date
    `, [today, today, email]);
    console.log(`   getShiftAssignmentsByEmail: ${shiftAssignmentsByEmail.rows.length} assignments found`);
    
  } catch (error) {
    console.error('❌ Error debugging james.taylor:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
debugJamesTaylor().catch(console.error);
