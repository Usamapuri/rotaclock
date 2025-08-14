const { Pool } = require('pg');

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

async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    
    // Check employees
    const employeesResult = await pool.query('SELECT COUNT(*) as count FROM employees');
    console.log(`Employees: ${employeesResult.rows[0].count}`);
    
    // Check shifts
    const shiftsResult = await pool.query('SELECT COUNT(*) as count FROM shifts');
    console.log(`Shifts: ${shiftsResult.rows[0].count}`);
    
    // Check shift assignments
    const assignmentsResult = await pool.query('SELECT COUNT(*) as count FROM shift_assignments');
    console.log(`Shift Assignments: ${assignmentsResult.rows[0].count}`);
    
    // Check today's assignments
    const today = new Date().toISOString().split('T')[0];
    const todayAssignmentsResult = await pool.query(
      'SELECT COUNT(*) as count FROM shift_assignments WHERE date = $1',
      [today]
    );
    console.log(`Today's Assignments (${today}): ${todayAssignmentsResult.rows[0].count}`);
    
    // Check shift logs
    const shiftLogsResult = await pool.query('SELECT COUNT(*) as count FROM shift_logs');
    console.log(`Shift Logs: ${shiftLogsResult.rows[0].count}`);
    
    // Check active shift logs
    const activeShiftLogsResult = await pool.query("SELECT COUNT(*) as count FROM shift_logs WHERE status = 'active'");
    console.log(`Active Shift Logs: ${activeShiftLogsResult.rows[0].count}`);
    
    // Check break logs
    const breakLogsResult = await pool.query('SELECT COUNT(*) as count FROM break_logs');
    console.log(`Break Logs: ${breakLogsResult.rows[0].count}`);
    
    // Check active break logs
    const activeBreakLogsResult = await pool.query("SELECT COUNT(*) as count FROM break_logs WHERE status = 'active'");
    console.log(`Active Break Logs: ${activeBreakLogsResult.rows[0].count}`);
    
    // Show some sample data
    console.log('\nSample Employees:');
    const sampleEmployees = await pool.query('SELECT id, first_name, last_name, email FROM employees LIMIT 3');
    sampleEmployees.rows.forEach(emp => {
      console.log(`  ${emp.first_name} ${emp.last_name} (${emp.email})`);
    });
    
    console.log('\nSample Shifts:');
    const sampleShifts = await pool.query('SELECT id, name, start_time, end_time FROM shifts LIMIT 3');
    sampleShifts.rows.forEach(shift => {
      console.log(`  ${shift.name} (${shift.start_time} - ${shift.end_time})`);
    });
    
    console.log('\nSample Shift Assignments:');
    const sampleAssignments = await pool.query(`
      SELECT sa.date, sa.status, e.first_name, e.last_name, s.name as shift_name 
      FROM shift_assignments sa 
      JOIN employees e ON sa.employee_id = e.id 
      JOIN shifts s ON sa.shift_id = s.id 
      ORDER BY sa.date DESC LIMIT 5
    `);
    sampleAssignments.rows.forEach(assignment => {
      console.log(`  ${assignment.first_name} ${assignment.last_name} - ${assignment.shift_name} on ${assignment.date} (${assignment.status})`);
    });
    
    console.log('\nToday\'s Shift Assignments:');
    const todayAssignments = await pool.query(`
      SELECT sa.date, sa.status, e.first_name, e.last_name, s.name as shift_name, sa.id
      FROM shift_assignments sa 
      JOIN employees e ON sa.employee_id = e.id 
      JOIN shifts s ON sa.shift_id = s.id 
      WHERE sa.date = $1
    `, [today]);
    todayAssignments.rows.forEach(assignment => {
      console.log(`  ${assignment.first_name} ${assignment.last_name} - ${assignment.shift_name} (${assignment.status}) - ID: ${assignment.id}`);
    });
    
  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 