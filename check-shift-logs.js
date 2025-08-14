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

async function checkShiftLogs() {
  try {
    console.log('Checking shift logs...');
    
    // Get active shift logs
    const activeShiftLogs = await pool.query(`
      SELECT sl.*, e.first_name, e.last_name, e.email
      FROM shift_logs sl
      JOIN employees e ON sl.employee_id = e.id
      WHERE sl.status = 'active'
      ORDER BY sl.created_at DESC
    `);
    
    console.log(`Active Shift Logs: ${activeShiftLogs.rows.length}`);
    
    activeShiftLogs.rows.forEach((log, index) => {
      console.log(`\nShift Log ${index + 1}:`);
      console.log(`  Employee: ${log.first_name} ${log.last_name}`);
      console.log(`  Clock In: ${log.clock_in_time}`);
      console.log(`  Break Time Used: ${log.break_time_used} (type: ${typeof log.break_time_used})`);
      console.log(`  Max Break Allowed: ${log.max_break_allowed} (type: ${typeof log.max_break_allowed})`);
      console.log(`  Status: ${log.status}`);
      console.log(`  Created: ${log.created_at}`);
    });
    
    // Get break logs
    const breakLogs = await pool.query(`
      SELECT bl.*, e.first_name, e.last_name
      FROM break_logs bl
      JOIN employees e ON bl.employee_id = e.id
      WHERE bl.status = 'active'
      ORDER BY bl.created_at DESC
    `);
    
    console.log(`\nActive Break Logs: ${breakLogs.rows.length}`);
    
    breakLogs.rows.forEach((log, index) => {
      console.log(`\nBreak Log ${index + 1}:`);
      console.log(`  Employee: ${log.first_name} ${log.last_name}`);
      console.log(`  Break Start: ${log.break_start_time}`);
      console.log(`  Break Duration: ${log.break_duration} (type: ${typeof log.break_duration})`);
      console.log(`  Status: ${log.status}`);
    });
    
  } catch (error) {
    console.error('Error checking shift logs:', error);
  } finally {
    await pool.end();
  }
}

checkShiftLogs();
