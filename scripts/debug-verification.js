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

async function debugVerification() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging verification workflow...');
    
    // Test with john.smith@rotacloud.com
    const email = 'john.smith@rotacloud.com';
    
    // 1. Find the employee
    const employeeResult = await client.query(`
      SELECT id, employee_id, first_name, last_name, email, role
      FROM employees 
      WHERE email = $1
    `, [email]);
    
    if (employeeResult.rows.length === 0) {
      console.log('❌ Employee not found');
      return;
    }
    
    const employee = employeeResult.rows[0];
    console.log('✅ Employee found:');
    console.log(`   ID (UUID): ${employee.id}`);
    console.log(`   Employee ID: ${employee.employee_id}`);
    console.log(`   Name: ${employee.first_name} ${employee.last_name}`);
    console.log(`   Email: ${employee.email}`);
    console.log(`   Role: ${employee.role}`);
    
    // 2. Check if employee is already clocked in
    const clockedInResult = await client.query(`
      SELECT id FROM shift_logs 
      WHERE employee_id = $1 
      AND status = 'active'
    `, [employee.id]);
    
    const isClockedIn = clockedInResult.rows.length > 0;
    console.log(`\n🔍 Clock-in status: ${isClockedIn ? 'Already clocked in' : 'Not clocked in'}`);
    
    if (isClockedIn) {
      console.log('   Active shift log:', clockedInResult.rows[0]);
    }
    
    // 3. Check today's shift assignments
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n🔍 Checking shift assignments for ${today}:`);
    
    const shiftAssignmentsResult = await client.query(`
      SELECT 
        sa.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        s.name as shift_name,
        s.start_time as shift_start_time,
        s.end_time as shift_end_time
      FROM shift_assignments sa
      LEFT JOIN employees e ON sa.employee_id = e.id
      LEFT JOIN shifts s ON sa.shift_id = s.id
      WHERE sa.date = $1 AND sa.employee_id = $2
    `, [today, employee.id]);
    
    console.log(`   Found ${shiftAssignmentsResult.rows.length} shift assignments`);
    
    shiftAssignmentsResult.rows.forEach((assignment, index) => {
      console.log(`   Assignment ${index + 1}:`);
      console.log(`     ID: ${assignment.id}`);
      console.log(`     Shift: ${assignment.shift_name} (${assignment.shift_start_time} - ${assignment.shift_end_time})`);
      console.log(`     Status: ${assignment.status}`);
    });
    
    // 4. Test the getShiftAssignments function logic
    console.log('\n🔍 Testing getShiftAssignments function logic:');
    
    // Test with UUID
    const uuidAssignments = await client.query(`
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
      WHERE sa.date >= $1 AND sa.date <= $2 AND sa.employee_id = $3
      ORDER BY sa.date
    `, [today, today, employee.id]);
    
    console.log(`   UUID search: ${uuidAssignments.rows.length} assignments`);
    
    // Test with employee_id string
    const stringAssignments = await client.query(`
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
      WHERE sa.date >= $1 AND sa.date <= $2 AND e.employee_id = $3
      ORDER BY sa.date
    `, [today, today, employee.employee_id]);
    
    console.log(`   Employee ID string search: ${stringAssignments.rows.length} assignments`);
    
    // 5. Check if shift_logs table exists and has data
    console.log('\n🔍 Checking shift_logs table:');
    
    const shiftLogsResult = await client.query(`
      SELECT COUNT(*) as count FROM shift_logs
    `);
    
    console.log(`   Total shift logs: ${shiftLogsResult.rows[0].count}`);
    
    // 6. Check if verification_images directory would be created
    console.log('\n🔍 File system check:');
    const fs = require('fs');
    const path = require('path');
    
    const imageDir = path.join(process.cwd(), 'verification_images');
    console.log(`   Verification images directory: ${imageDir}`);
    console.log(`   Directory exists: ${fs.existsSync(imageDir)}`);
    
    const csvPath = path.join(process.cwd(), 'verification_logs.csv');
    console.log(`   Verification logs CSV: ${csvPath}`);
    console.log(`   CSV exists: ${fs.existsSync(csvPath)}`);
    
  } catch (error) {
    console.error('❌ Error debugging verification:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
debugVerification().catch(console.error);
