const { Pool } = require('pg')

// Railway database configuration
const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkPayrollData() {
  try {
    console.log('🔍 Checking payroll data in Railway database...\n')

    // Check if payroll tables exist
    console.log('📋 Checking payroll tables...')
    const tables = [
      'payroll_periods',
      'payroll_records', 
      'payroll_deductions',
      'payroll_bonuses',
      'employee_salaries',
      'shift_logs',
      'employees'
    ]

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`)
        console.log(`   ✅ ${table}: ${result.rows[0].count} records`)
      } catch (error) {
        console.log(`   ❌ ${table}: Table does not exist - ${error.message}`)
      }
    }

    console.log('\n📊 Checking payroll periods...')
    const periodsResult = await pool.query(`
      SELECT id, period_name, start_date, end_date, status, total_employees, total_payroll_amount
      FROM payroll_periods
      ORDER BY start_date DESC
      LIMIT 5
    `)
    
    if (periodsResult.rows.length > 0) {
      console.log('   Found payroll periods:')
      periodsResult.rows.forEach(period => {
        console.log(`   - ${period.period_name} (${period.start_date} to ${period.end_date}) - Status: ${period.status}`)
        console.log(`     Total employees: ${period.total_employees}, Total amount: PKR ${period.total_payroll_amount}`)
      })
    } else {
      console.log('   ❌ No payroll periods found')
    }

    console.log('\n👥 Checking employees with salary data...')
    const employeesResult = await pool.query(`
      SELECT 
        e.id,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.hourly_rate,
        COALESCE(es.base_salary, 20000) as base_salary,
        e.is_active
      FROM employees e
      LEFT JOIN employee_salaries es ON e.employee_id = es.employee_id
      WHERE e.is_active = true
      LIMIT 10
    `)
    
    if (employeesResult.rows.length > 0) {
      console.log('   Active employees with salary data:')
      employeesResult.rows.forEach(emp => {
        console.log(`   - ${emp.first_name} ${emp.last_name} (${emp.employee_id})`)
        console.log(`     Hourly rate: PKR ${emp.hourly_rate || 0}, Base salary: PKR ${emp.base_salary}`)
      })
    } else {
      console.log('   ❌ No active employees found')
    }

    console.log('\n⏰ Checking shift logs for payroll calculation...')
    const shiftLogsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_logs,
        COUNT(CASE WHEN is_late = true THEN 1 END) as late_shifts,
        COUNT(CASE WHEN is_no_show = true THEN 1 END) as no_shows,
        COALESCE(SUM(total_shift_hours), 0) as total_hours
      FROM shift_logs
      WHERE clock_in_time >= CURRENT_DATE - INTERVAL '30 days'
    `)
    
    const shiftStats = shiftLogsResult.rows[0]
    console.log(`   Shift logs in last 30 days:`)
    console.log(`   - Total logs: ${shiftStats.total_logs}`)
    console.log(`   - Completed logs: ${shiftStats.completed_logs}`)
    console.log(`   - Late shifts: ${shiftStats.late_shifts}`)
    console.log(`   - No-shows: ${shiftStats.no_shows}`)
    console.log(`   - Total hours: ${shiftStats.total_hours}`)

    console.log('\n💰 Checking payroll records...')
    const recordsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_records,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_records,
        COALESCE(SUM(net_pay), 0) as total_net_pay
      FROM payroll_records
    `)
    
    const recordStats = recordsResult.rows[0]
    console.log(`   Payroll records:`)
    console.log(`   - Total records: ${recordStats.total_records}`)
    console.log(`   - Pending: ${recordStats.pending_records}`)
    console.log(`   - Paid: ${recordStats.paid_records}`)
    console.log(`   - Total net pay: PKR ${recordStats.total_net_pay}`)

    console.log('\n🔧 Checking for potential issues...')
    
    // Check if there are any employees without salary data
    const missingSalaryResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM employees e
      LEFT JOIN employee_salaries es ON e.employee_id = es.employee_id
      WHERE e.is_active = true AND es.employee_id IS NULL
    `)
    
    if (missingSalaryResult.rows[0].count > 0) {
      console.log(`   ⚠️  ${missingSalaryResult.rows[0].count} active employees missing salary data`)
    } else {
      console.log('   ✅ All active employees have salary data')
    }

    // Check if there are any payroll periods without records
    const periodsWithoutRecordsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM payroll_periods pp
      LEFT JOIN payroll_records pr ON pp.id = pr.payroll_period_id
      WHERE pr.id IS NULL
    `)
    
    if (periodsWithoutRecordsResult.rows[0].count > 0) {
      console.log(`   ⚠️  ${periodsWithoutRecordsResult.rows[0].count} payroll periods without records`)
    } else {
      console.log('   ✅ All payroll periods have records')
    }

    console.log('\n✅ Payroll data check completed!')

  } catch (error) {
    console.error('❌ Error checking payroll data:', error)
  } finally {
    await pool.end()
  }
}

checkPayrollData()
