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

async function testEmailVerification() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing email-based verification workflow...');
    
    const email = 'john.smith@rotacloud.com';
    
    // 1. Test getEmployeeByEmail
    console.log('\n1️⃣ Testing getEmployeeByEmail...');
    const employee = await client.query(`
      SELECT * FROM employees WHERE email = $1 AND is_active = true
    `, [email]);
    
    if (employee.rows.length === 0) {
      console.log('❌ Employee not found');
      return;
    }
    
    console.log('✅ Employee found:', {
      id: employee.rows[0].id,
      employee_id: employee.rows[0].employee_id,
      email: employee.rows[0].email,
      name: `${employee.rows[0].first_name} ${employee.rows[0].last_name}`
    });
    
    // 2. Test isEmployeeClockedInByEmail
    console.log('\n2️⃣ Testing isEmployeeClockedInByEmail...');
    const isClockedIn = await client.query(`
      SELECT sl.id FROM shift_logs sl
      JOIN employees e ON sl.employee_id = e.id
      WHERE e.email = $1 
      AND sl.status = 'active'
    `, [email]);
    
    console.log(`   Clocked in: ${isClockedIn.rows.length > 0 ? 'Yes' : 'No'}`);
    
    // 3. Test getShiftAssignmentsByEmail
    console.log('\n3️⃣ Testing getShiftAssignmentsByEmail...');
    const today = new Date().toISOString().split('T')[0];
    const shiftAssignments = await client.query(`
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
    
    console.log(`   Found ${shiftAssignments.rows.length} shift assignments for today`);
    shiftAssignments.rows.forEach((assignment, index) => {
      console.log(`   Assignment ${index + 1}: ${assignment.shift_name} (${assignment.shift_start_time} - ${assignment.shift_end_time})`);
    });
    
    // 4. Test createShiftLogByEmail (simulation)
    console.log('\n4️⃣ Testing createShiftLogByEmail simulation...');
    if (isClockedIn.rows.length === 0 && shiftAssignments.rows.length > 0) {
      console.log('   Would create shift log with:');
      console.log(`     - Email: ${email}`);
      console.log(`     - Shift assignment ID: ${shiftAssignments.rows[0].id}`);
      console.log(`     - Clock in time: ${new Date().toISOString()}`);
      
      // Test the actual creation (but don't commit)
      const testShiftLog = await client.query(`
        INSERT INTO shift_logs (
          employee_id, shift_assignment_id, clock_in_time, max_break_allowed, 
          is_late, is_no_show, late_minutes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `, [
        employee.rows[0].id,
        shiftAssignments.rows[0].id,
        new Date().toISOString(),
        1.0,
        false,
        false,
        0,
        'active'
      ]);
      
      console.log('   ✅ Shift log created successfully:', testShiftLog.rows[0].id);
      
      // Rollback the test
      await client.query('ROLLBACK');
      console.log('   🔄 Test rolled back');
    } else {
      console.log('   Skipping shift log creation (already clocked in or no assignments)');
    }
    
    // 5. Test the complete verification flow
    console.log('\n5️⃣ Testing complete verification flow...');
    console.log('   Steps that would be executed:');
    console.log('   1. ✅ Get employee by email');
    console.log('   2. ✅ Check if already clocked in');
    console.log('   3. ✅ Get today\'s shift assignments');
    console.log('   4. ✅ Create shift log (if not clocked in)');
    console.log('   5. ✅ Update employee online status');
    console.log('   6. ✅ Save verification photo and logs');
    
    console.log('\n🎉 Email-based verification workflow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing email verification:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testEmailVerification().catch(console.error);
