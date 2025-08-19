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

async function testShiftLogs() {
  try {
    console.log('🔄 Testing shift logs...');
    
    const employeeId = '3a6f7885-143e-40f0-80f9-a37605744fe1';
    
    // Check all shift logs for this employee
    const allLogsResult = await pool.query(
      'SELECT id, status, clock_in_time, clock_out_time FROM shift_logs WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 5',
      [employeeId]
    );
    
    console.log('All shift logs:', allLogsResult.rows);
    
    // Check active shift logs
    const activeLogsResult = await pool.query(
      'SELECT id, status, clock_in_time, clock_out_time FROM shift_logs WHERE employee_id = $1 AND status = $2',
      [employeeId, 'active']
    );
    
    console.log('Active shift logs:', activeLogsResult.rows);
    
  } catch (error) {
    console.error('❌ Error testing shift logs:', error);
  } finally {
    await pool.end();
  }
}

testShiftLogs();
