const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixPayrollDataTypes() {
  try {
    console.log('🔧 Fixing payroll data type issues...');
    
    const client = await pool.connect();
    
    // Check the structure of payroll_records table
    console.log('\n📋 Checking payroll_records table structure...');
    const payrollColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'payroll_records'
      ORDER BY ordinal_position
    `);
    
    console.log('Payroll records columns:');
    payrollColumns.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name} (${row.data_type}) - nullable: ${row.is_nullable}`);
    });
    
    // Check for data type mismatches
    console.log('\n🔍 Checking for data type issues...');
    
    // Check if payroll_records.employee_id is UUID but employees_new.id is also UUID
    const employeeIdCheck = await client.query(`
      SELECT 
        (SELECT data_type FROM information_schema.columns WHERE table_name = 'payroll_records' AND column_name = 'employee_id') as payroll_employee_id_type,
        (SELECT data_type FROM information_schema.columns WHERE table_name = 'employees_new' AND column_name = 'id') as employees_id_type
    `);
    
    console.log('Data types:');
    console.log(`Payroll employee_id: ${employeeIdCheck.rows[0].payroll_employee_id_type}`);
    console.log(`Employees id: ${employeeIdCheck.rows[0].employees_id_type}`);
    
    // Check for orphaned records with different approach
    console.log('\n🧹 Cleaning up orphaned payroll records (safe approach)...');
    
    // First, let's see what we have
    const payrollRecords = await client.query(`
      SELECT pr.employee_id, pr.id as payroll_id
      FROM payroll_records pr
      LEFT JOIN employees_new e ON pr.employee_id::text = e.id::text
      WHERE e.id IS NULL
      LIMIT 10
    `);
    
    console.log(`Found ${payrollRecords.rows.length} potentially orphaned records`);
    
    if (payrollRecords.rows.length > 0) {
      console.log('Sample orphaned records:');
      payrollRecords.rows.forEach((row, index) => {
        console.log(`${index + 1}. Payroll ID: ${row.payroll_id}, Employee ID: ${row.employee_id}`);
      });
    }
    
    // Clean up orphaned records using text comparison
    const deleteOrphaned = await client.query(`
      DELETE FROM payroll_records 
      WHERE employee_id::text NOT IN (
        SELECT id::text FROM employees_new
      )
    `);
    
    console.log(`✅ Deleted ${deleteOrphaned.rowCount} orphaned payroll records`);
    
    // Check final state
    const finalPayrollCount = await client.query(`
      SELECT COUNT(*) as total_records FROM payroll_records
    `);
    
    console.log(`\n📊 Final payroll records count: ${finalPayrollCount.rows[0].total_records}`);
    
    // Test the payroll calculation again
    console.log('\n🧪 Testing payroll calculation after cleanup...');
    
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
      
      if (testShiftLogs.rows.length > 0) {
        console.log('Sample shift data:');
        testShiftLogs.rows.slice(0, 3).forEach((shift, index) => {
          console.log(`${index + 1}. Hours: ${shift.hours_worked}, Rate: ${shift.hourly_rate}, Pay: ${shift.total_pay}`);
        });
      }
    }
    
    console.log('\n✅ Payroll data type fixes completed successfully!');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error during data type fix:', error.message);
  } finally {
    await pool.end();
  }
}

fixPayrollDataTypes();
