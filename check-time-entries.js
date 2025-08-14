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

async function checkTimeEntries() {
  try {
    console.log('Checking legacy time entries...');
    
    // Get all time entries
    const allTimeEntries = await pool.query(`
      SELECT te.*, e.first_name, e.last_name, e.email
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      ORDER BY te.created_at DESC
      LIMIT 10
    `);
    
    console.log(`Total time entries: ${allTimeEntries.rows.length}`);
    
    // Get active time entries
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
    
    // Get today's time entries
    const today = new Date().toISOString().split('T')[0];
    const todayTimeEntries = await pool.query(`
      SELECT te.*, e.first_name, e.last_name, e.email
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      WHERE DATE(te.created_at) = $1
      ORDER BY te.created_at DESC
    `, [today]);
    
    console.log(`\nToday's time entries: ${todayTimeEntries.rows.length}`);
    
    if (todayTimeEntries.rows.length > 0) {
      console.log('\nToday\'s Time Entries:');
      todayTimeEntries.rows.forEach((entry, index) => {
        console.log(`\nEntry ${index + 1}:`);
        console.log(`  Employee: ${entry.first_name} ${entry.last_name}`);
        console.log(`  Status: ${entry.status}`);
        console.log(`  Clock In: ${entry.clock_in}`);
        console.log(`  Clock Out: ${entry.clock_out}`);
        console.log(`  Created: ${entry.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking time entries:', error);
  } finally {
    await pool.end();
  }
}

checkTimeEntries();
