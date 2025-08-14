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

async function fixLegacyEntry() {
  try {
    console.log('Fixing legacy time entry...');
    
    // Find the active time entry
    const activeEntry = await pool.query(`
      SELECT te.*, e.first_name, e.last_name, e.email
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      WHERE te.status = 'in-progress' OR te.status = 'break'
      ORDER BY te.created_at DESC
      LIMIT 1
    `);
    
    if (activeEntry.rows.length === 0) {
      console.log('No active time entries found');
      return;
    }
    
    const entry = activeEntry.rows[0];
    console.log(`Found active entry for ${entry.first_name} ${entry.last_name}`);
    console.log(`Clock In: ${entry.clock_in}`);
    console.log(`Status: ${entry.status}`);
    
    // Calculate total hours worked
    const clockInTime = new Date(entry.clock_in);
    const now = new Date();
    const totalHours = Math.round(((now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)) * 100) / 100;
    
    console.log(`Total hours worked: ${totalHours}h`);
    
    // Update the time entry to completed
    const updateResult = await pool.query(`
      UPDATE time_entries
      SET status = 'completed', 
          clock_out = $1,
          total_hours = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [now.toISOString(), totalHours, entry.id]);
    
    console.log(`✅ Updated time entry ${entry.id} to completed status`);
    console.log(`Clock out time: ${now.toISOString()}`);
    console.log(`Total hours: ${totalHours}h`);
    
    // Verify the fix
    const remainingActive = await pool.query(`
      SELECT COUNT(*) as count
      FROM time_entries
      WHERE status = 'in-progress' OR status = 'break'
    `);
    
    console.log(`\nRemaining active time entries: ${remainingActive.rows[0].count}`);
    
    if (remainingActive.rows[0].count === 0) {
      console.log('✅ All legacy time entries are now completed');
    }
    
  } catch (error) {
    console.error('Error fixing legacy entry:', error);
  } finally {
    await pool.end();
  }
}

fixLegacyEntry();
