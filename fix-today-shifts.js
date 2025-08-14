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

async function fixTodayShifts() {
  try {
    console.log('🔄 Fixing today\'s shift assignments...');
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log('Today\'s date:', today);
    
    // Update completed assignments to assigned for today
    const updateResult = await pool.query(
      `UPDATE shift_assignments 
       SET status = 'assigned', updated_at = NOW() 
       WHERE date = $1 AND status = 'completed'`,
      [today]
    );
    
    console.log(`✅ Updated ${updateResult.rowCount} shift assignments to 'assigned' status`);
    
    // Show the updated assignments
    const todayAssignments = await pool.query(`
      SELECT sa.date, sa.status, e.first_name, e.last_name, s.name as shift_name, sa.id
      FROM shift_assignments sa 
      JOIN employees e ON sa.employee_id = e.id 
      JOIN shifts s ON sa.shift_id = s.id 
      WHERE sa.date = $1
      ORDER BY e.first_name, e.last_name
    `, [today]);
    
    console.log('\nToday\'s Shift Assignments after fix:');
    todayAssignments.rows.forEach(assignment => {
      console.log(`  ${assignment.first_name} ${assignment.last_name} - ${assignment.shift_name} (${assignment.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing today\'s shifts:', error);
  } finally {
    await pool.end();
  }
}

fixTodayShifts();
