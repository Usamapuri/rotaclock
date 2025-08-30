const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

async function cleanupOldData() {
  try {
    console.log('🧹 Starting cleanup of old data...');
    
    const client = await pool.connect();
    
    // Check for old shift tables (shift2, shift3, etc.)
    const oldShiftTables = ['shift2', 'shift3', 'shift4', 'shift5', 'shift6'];
    
    console.log('📋 Checking old shift tables...');
    for (const tableName of oldShiftTables) {
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [tableName]);
      
      if (tableExists.rows[0].exists) {
        console.log(`🗑️  Found old table: ${tableName}`);
        
        // Check if table has data
        const rowCount = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`   Rows in ${tableName}: ${rowCount.rows[0].count}`);
        
        // Ask if user wants to drop it (for safety, we'll just show info for now)
        console.log(`   ⚠️  Consider dropping ${tableName} if no longer needed`);
      }
    }
    
    // Check for old employee data
    console.log('\n📋 Checking for old employee data...');
    
    // Check if there are any employees with old employee codes
    const oldEmployeeCodes = await client.query(`
      SELECT employee_code, first_name, last_name, created_at
      FROM employees_new 
      WHERE employee_code LIKE 'EMP%' 
      OR employee_code LIKE 'AG%'
      OR employee_code LIKE 'PM%'
      OR employee_code LIKE 'TL%'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('📋 Employees with old-style codes:');
    oldEmployeeCodes.rows.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.first_name} ${emp.last_name} (${emp.employee_code}) - Created: ${emp.created_at}`);
    });
    
    // Check payroll records for old data
    console.log('\n📋 Checking payroll records...');
    const payrollRecords = await client.query(`
      SELECT COUNT(*) as total_records
      FROM payroll_records
    `);
    
    console.log(`Total payroll records: ${payrollRecords.rows[0].total_records}`);
    
    // Check for any orphaned records
    const orphanedRecords = await client.query(`
      SELECT COUNT(*) as orphaned_count
      FROM payroll_records pr
      LEFT JOIN employees_new e ON pr.employee_id = e.id
      WHERE e.id IS NULL
    `);
    
    console.log(`Orphaned payroll records: ${orphanedRecords.rows[0].orphaned_count}`);
    
    // Check shift_logs for any issues
    console.log('\n📋 Checking shift_logs data...');
    const shiftLogsCount = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE approval_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE approval_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM shift_logs
    `);
    
    const stats = shiftLogsCount.rows[0];
    console.log(`Total shift logs: ${stats.total}`);
    console.log(`Approved: ${stats.approved}, Pending: ${stats.pending}, Completed: ${stats.completed}`);
    
    // Check for any shift logs with null approved_rate or total_pay
    const nullDataCheck = await client.query(`
      SELECT COUNT(*) as null_approved_rate, 
             COUNT(*) FILTER (WHERE total_pay IS NULL) as null_total_pay
      FROM shift_logs 
      WHERE approval_status = 'approved'
    `);
    
    console.log(`Approved shifts with null approved_rate: ${nullDataCheck.rows[0].null_approved_rate}`);
    console.log(`Approved shifts with null total_pay: ${nullDataCheck.rows[0].null_total_pay}`);
    
    // Suggest cleanup actions
    console.log('\n🧹 Suggested cleanup actions:');
    console.log('1. Drop old shift tables (shift2, shift3, etc.) if no longer needed');
    console.log('2. Update approved shifts with null approved_rate and total_pay');
    console.log('3. Remove orphaned payroll records');
    console.log('4. Consider standardizing employee codes');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error during cleanup check:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupOldData();
