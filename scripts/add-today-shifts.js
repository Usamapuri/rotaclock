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

async function addTodayShifts() {
  try {
    console.log('🔄 Adding shift assignments for today...');
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log('Today\'s date:', today);
    
    // Get an employee ID
    const employeeResult = await pool.query('SELECT id FROM employees LIMIT 1');
    if (employeeResult.rows.length === 0) {
      console.log('❌ No employees found');
      return;
    }
    const employeeId = employeeResult.rows[0].id;
    console.log('Employee ID:', employeeId);
    
    // Get a shift ID
    const shiftResult = await pool.query('SELECT id FROM shifts LIMIT 1');
    if (shiftResult.rows.length === 0) {
      console.log('❌ No shifts found');
      return;
    }
    const shiftId = shiftResult.rows[0].id;
    console.log('Shift ID:', shiftId);
    
    // Check if shift assignment already exists for today
    const existingResult = await pool.query(
      'SELECT id FROM shift_assignments WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );
    
    if (existingResult.rows.length > 0) {
      console.log('✅ Shift assignment already exists for today');
      return;
    }
    
    // Create shift assignment for today
    const insertResult = await pool.query(
      `INSERT INTO shift_assignments (
        employee_id, shift_id, date, start_time, end_time, status, assigned_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [employeeId, shiftId, today, '09:00:00', '17:00:00', 'assigned', null]
    );
    
    console.log('✅ Created shift assignment:', insertResult.rows[0].id);
    
    // Also create assignments for the next few days
    for (let i = 1; i <= 5; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      const futureResult = await pool.query(
        'SELECT id FROM shift_assignments WHERE employee_id = $1 AND date = $2',
        [employeeId, futureDateStr]
      );
      
      if (futureResult.rows.length === 0) {
        await pool.query(
          `INSERT INTO shift_assignments (
            employee_id, shift_id, date, start_time, end_time, status, assigned_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [employeeId, shiftId, futureDateStr, '09:00:00', '17:00:00', 'assigned', null]
        );
        console.log(`✅ Created shift assignment for ${futureDateStr}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error adding today\'s shifts:', error);
  } finally {
    await pool.end();
  }
}

addTodayShifts();
