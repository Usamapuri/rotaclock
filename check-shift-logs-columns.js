const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkShiftLogsColumns() {
  try {
    console.log('🔍 Checking shift_logs table columns...');
    
    const client = await pool.connect();
    
    // Check the structure of shift_logs table
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'shift_logs'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 shift_logs table columns:');
    columnsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name} (${row.data_type}) - nullable: ${row.is_nullable}`);
    });
    
    // Check if there are any old tables that might be causing issues
    const oldTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%employee%' 
      OR table_name LIKE '%shift%'
      OR table_name LIKE '%payroll%'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Related tables:');
    oldTablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    // Check for any data inconsistencies
    const sampleShiftLogs = await client.query(`
      SELECT id, employee_id, approved_hours, approved_rate, total_pay
      FROM shift_logs 
      WHERE approval_status = 'approved'
      LIMIT 5
    `);
    
    console.log('\n📋 Sample approved shift logs:');
    sampleShiftLogs.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Employee: ${row.employee_id}`);
      console.log(`   Approved Hours: ${row.approved_hours}, Approved Rate: ${row.approved_rate}, Total Pay: ${row.total_pay}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkShiftLogsColumns();
