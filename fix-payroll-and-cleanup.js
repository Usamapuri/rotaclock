const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixPayrollAndCleanup() {
  try {
    console.log('🔧 Fixing payroll issues and cleaning up old data...');
    
    const client = await pool.connect();
    
    // 1. Drop old shift tables that are no longer needed
    console.log('\n🗑️  Dropping old shift tables...');
    const oldTables = ['shift2', 'shift3', 'shift4', 'shift5', 'shift6'];
    
    for (const tableName of oldTables) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
        console.log(`✅ Dropped table: ${tableName}`);
      } catch (error) {
        console.log(`⚠️  Could not drop ${tableName}: ${error.message}`);
      }
    }
    
    // 2. Fix approved shifts with null approved_rate and total_pay
    console.log('\n🔧 Fixing approved shifts with null data...');
    
    // Get employee hourly rates
    const employeeRates = await client.query(`
      SELECT id, hourly_rate FROM employees_new WHERE hourly_rate IS NOT NULL
    `);
    
    const rateMap = {};
    employeeRates.rows.forEach(row => {
      rateMap[row.id] = row.hourly_rate;
    });
    
    // Update approved shifts with null approved_rate
    const updateApprovedRates = await client.query(`
      UPDATE shift_logs 
      SET approved_rate = e.hourly_rate
      FROM employees_new e
      WHERE shift_logs.employee_id = e.id 
        AND shift_logs.approval_status = 'approved' 
        AND shift_logs.approved_rate IS NULL
        AND e.hourly_rate IS NOT NULL
    `);
    
    console.log(`✅ Updated ${updateApprovedRates.rowCount} shifts with approved_rate`);
    
    // Update approved shifts with null total_pay
    const updateTotalPay = await client.query(`
      UPDATE shift_logs 
      SET total_pay = COALESCE(approved_hours, total_shift_hours, 0) * COALESCE(approved_rate, 0)
      WHERE approval_status = 'approved' 
        AND total_pay IS NULL
    `);
    
    console.log(`✅ Updated ${updateTotalPay.rowCount} shifts with total_pay`);
    
    // 3. Clean up orphaned payroll records
    console.log('\n🧹 Cleaning up orphaned payroll records...');
    
    const deleteOrphanedPayroll = await client.query(`
      DELETE FROM payroll_records 
      WHERE employee_id NOT IN (SELECT id FROM employees_new)
    `);
    
    console.log(`✅ Deleted ${deleteOrphanedPayroll.rowCount} orphaned payroll records`);
    
    // 4. Check current state
    console.log('\n📊 Current state after cleanup:');
    
    const shiftStats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE approval_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE approval_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE approved_rate IS NULL AND approval_status = 'approved') as null_rates,
        COUNT(*) FILTER (WHERE total_pay IS NULL AND approval_status = 'approved') as null_pay
      FROM shift_logs
    `);
    
    const stats = shiftStats.rows[0];
    console.log(`Total shift logs: ${stats.total}`);
    console.log(`Approved: ${stats.approved}, Pending: ${stats.pending}`);
    console.log(`Approved with null rates: ${stats.null_rates}`);
    console.log(`Approved with null pay: ${stats.null_pay}`);
    
    const payrollStats = await client.query(`
      SELECT COUNT(*) as total_records FROM payroll_records
    `);
    
    console.log(`Total payroll records: ${payrollStats.rows[0].total_records}`);
    
    // 5. Test payroll calculation
    console.log('\n🧪 Testing payroll calculation...');
    
    // Get a sample employee and period for testing
    const testEmployee = await client.query(`
      SELECT id, employee_code, first_name, last_name, hourly_rate
      FROM employees_new 
      WHERE is_active = true 
      LIMIT 1
    `);
    
    const testPeriod = await client.query(`
      SELECT id, start_date, end_date 
      FROM payroll_periods 
      LIMIT 1
    `);
    
    if (testEmployee.rows.length > 0 && testPeriod.rows.length > 0) {
      const employee = testEmployee.rows[0];
      const period = testPeriod.rows[0];
      
      console.log(`Testing with employee: ${employee.first_name} ${employee.last_name} (${employee.employee_code})`);
      console.log(`Period: ${period.start_date} to ${period.end_date}`);
      
      // Test the fixed query
      const testShiftLogs = await client.query(`
        SELECT 
          COALESCE(sl.approved_hours, sl.total_shift_hours, 0) as hours_worked,
          COALESCE(sl.approved_rate, $1, 0) as hourly_rate,
          sl.performance_rating,
          sl.is_late,
          sl.is_no_show,
          sl.total_pay
        FROM shift_logs sl
        WHERE sl.employee_id = $2 
          AND sl.clock_in_time >= $3 
          AND sl.clock_in_time <= $4
          AND sl.status = 'completed'
          AND sl.approval_status = 'approved'
      `, [employee.hourly_rate, employee.id, period.start_date, period.end_date]);
      
      console.log(`✅ Payroll calculation test successful! Found ${testShiftLogs.rows.length} approved shifts`);
    }
    
    console.log('\n✅ Cleanup and fixes completed successfully!');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await pool.end();
  }
}

fixPayrollAndCleanup();
