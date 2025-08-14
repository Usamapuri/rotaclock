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

async function fixBreakLogs() {
  try {
    console.log('Fixing duplicate active break logs...');
    
    // Find employees with multiple active break logs
    const duplicateBreaks = await pool.query(`
      SELECT employee_id, COUNT(*) as count
      FROM break_logs
      WHERE status = 'active'
      GROUP BY employee_id
      HAVING COUNT(*) > 1
    `);
    
    console.log(`Found ${duplicateBreaks.rows.length} employees with duplicate active breaks`);
    
    for (const duplicate of duplicateBreaks.rows) {
      console.log(`\nFixing breaks for employee ${duplicate.employee_id} (${duplicate.count} active breaks)`);
      
      // Get all active break logs for this employee, ordered by creation time
      const activeBreaks = await pool.query(`
        SELECT id, break_start_time, created_at
        FROM break_logs
        WHERE employee_id = $1 AND status = 'active'
        ORDER BY created_at ASC
      `, [duplicate.employee_id]);
      
      // Keep the most recent one, cancel the others
      const breaksToCancel = activeBreaks.rows.slice(0, -1); // All except the last one
      
      for (const breakLog of breaksToCancel) {
        console.log(`  Cancelling break ${breakLog.id} (started at ${breakLog.break_start_time})`);
        
        await pool.query(`
          UPDATE break_logs
          SET status = 'cancelled', updated_at = NOW()
          WHERE id = $1
        `, [breakLog.id]);
      }
    }
    
    // Verify the fix
    const remainingActiveBreaks = await pool.query(`
      SELECT bl.*, e.first_name, e.last_name
      FROM break_logs bl
      JOIN employees e ON bl.employee_id = e.id
      WHERE bl.status = 'active'
      ORDER BY bl.created_at DESC
    `);
    
    console.log(`\nRemaining active break logs: ${remainingActiveBreaks.rows.length}`);
    remainingActiveBreaks.rows.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.first_name} ${log.last_name} - Started: ${log.break_start_time}`);
    });
    
  } catch (error) {
    console.error('Error fixing break logs:', error);
  } finally {
    await pool.end();
  }
}

fixBreakLogs();
