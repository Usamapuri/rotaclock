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

async function checkActiveEntries() {
  try {
    console.log('Checking for any active entries...');
    
    // Check for active time entries
    const activeTimeEntries = await pool.query(`
      SELECT te.*, e.first_name, e.last_name, e.email
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      WHERE te.status = 'in-progress' OR te.status = 'break'
      ORDER BY te.created_at DESC
    `);
    
    console.log(`Active time entries: ${activeTimeEntries.rows.length}`);
    
    if (activeTimeEntries.rows.length > 0) {
      console.log('\nActive Time Entries:');
      activeTimeEntries.rows.forEach((entry, index) => {
        console.log(`\nEntry ${index + 1}:`);
        console.log(`  Employee: ${entry.first_name} ${entry.last_name}`);
        console.log(`  Status: ${entry.status}`);
        console.log(`  Clock In: ${entry.clock_in}`);
        console.log(`  Clock Out: ${entry.clock_out}`);
        console.log(`  Break Start: ${entry.break_start}`);
        console.log(`  Break End: ${entry.break_end}`);
        console.log(`  Created: ${entry.created_at}`);
      });
    }
    
    // Check for active shift logs
    const activeShiftLogs = await pool.query(`
      SELECT sl.*, e.first_name, e.last_name, e.email
      FROM shift_logs sl
      JOIN employees e ON sl.employee_id = e.id
      WHERE sl.status = 'active'
      ORDER BY sl.created_at DESC
    `);
    
    console.log(`\nActive shift logs: ${activeShiftLogs.rows.length}`);
    
    if (activeShiftLogs.rows.length > 0) {
      console.log('\nActive Shift Logs:');
      activeShiftLogs.rows.forEach((log, index) => {
        console.log(`\nShift Log ${index + 1}:`);
        console.log(`  Employee: ${log.first_name} ${log.last_name}`);
        console.log(`  Status: ${log.status}`);
        console.log(`  Clock In: ${log.clock_in_time}`);
        console.log(`  Clock Out: ${log.clock_out_time}`);
        console.log(`  Created: ${log.created_at}`);
      });
    }
    
    // Check for active break logs
    const activeBreakLogs = await pool.query(`
      SELECT bl.*, e.first_name, e.last_name, e.email
      FROM break_logs bl
      JOIN employees e ON bl.employee_id = e.id
      WHERE bl.status = 'active'
      ORDER BY bl.created_at DESC
    `);
    
    console.log(`\nActive break logs: ${activeBreakLogs.rows.length}`);
    
    if (activeBreakLogs.rows.length > 0) {
      console.log('\nActive Break Logs:');
      activeBreakLogs.rows.forEach((log, index) => {
        console.log(`\nBreak Log ${index + 1}:`);
        console.log(`  Employee: ${log.first_name} ${log.last_name}`);
        console.log(`  Status: ${log.status}`);
        console.log(`  Break Start: ${log.break_start_time}`);
        console.log(`  Break End: ${log.break_end_time}`);
        console.log(`  Created: ${log.created_at}`);
      });
    }
    
    // Summary
    const totalActive = activeTimeEntries.rows.length + activeShiftLogs.rows.length + activeBreakLogs.rows.length;
    console.log(`\nTotal active entries: ${totalActive}`);
    
    if (totalActive === 0) {
      console.log('✅ No active entries found - the clock out button should not be visible');
    } else {
      console.log('⚠️  Active entries found - this might be causing the clock out button to remain visible');
    }
    
  } catch (error) {
    console.error('Error checking active entries:', error);
  } finally {
    await pool.end();
  }
}

checkActiveEntries();
