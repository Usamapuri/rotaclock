const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function testPayrollDirect() {
  try {
    console.log('🧪 Testing payroll calculation directly...\n')
    
    // Get the latest payroll period
    const periodResult = await pool.query(`
      SELECT id, period_name, start_date, end_date, status
      FROM payroll_periods
      ORDER BY start_date DESC
      LIMIT 1
    `)
    
    if (periodResult.rows.length === 0) {
      console.log('❌ No payroll periods found')
      return
    }
    
    const period = periodResult.rows[0]
    console.log(`📅 Using payroll period: ${period.period_name} (ID: ${period.id})`)
    
    // Clear existing payroll records for this period
    await pool.query(`DELETE FROM payroll_records WHERE payroll_period_id = $1`, [period.id])
    console.log('🧹 Cleared existing payroll records for this period')
    
    // Get all active employees
    const employeesResult = await pool.query(`
      SELECT 
        e.id,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.hourly_rate,
        COALESCE(es.base_salary, 20000) as base_salary
      FROM employees e
      LEFT JOIN employee_salaries es ON e.employee_id = es.employee_id
      WHERE e.is_active = true
    `)
    
    const employees = employeesResult.rows
    console.log(`\n👥 Processing ${employees.length} active employees`)
    
    let totalEmployees = 0
    let totalAmount = 0
    
    // Calculate payroll for each employee
    for (const employee of employees) {
      console.log(`\n📊 Processing ${employee.first_name} ${employee.last_name} (${employee.employee_id})`)
      
      // Get shift logs for this employee in the period
      const shiftLogsResult = await pool.query(`
        SELECT 
          COALESCE(total_shift_hours, 0) as hours_worked,
          performance_rating,
          is_late,
          is_no_show
        FROM shift_logs
        WHERE employee_id = $1 
        AND clock_in_time >= $2 
        AND clock_in_time <= $3
      `, [employee.id, period.start_date, period.end_date])
      
      const shiftLogs = shiftLogsResult.rows
      console.log(`   Found ${shiftLogs.length} shift logs`)
      
      // Calculate total hours worked
      const totalHours = shiftLogs.reduce((sum, log) => {
        const hours = parseFloat(log.hours_worked) || 0
        return sum + hours
      }, 0)
      
      // Calculate overtime (hours over 40 per week)
      const weeksInPeriod = Math.ceil((new Date(period.end_date) - new Date(period.start_date)) / (1000 * 60 * 60 * 24 * 7))
      const maxRegularHours = weeksInPeriod * 40
      const overtimeHours = Math.max(0, totalHours - maxRegularHours)
      const regularHours = totalHours - overtimeHours
      
      // Calculate pay
      const hourlyPay = regularHours * (employee.hourly_rate || 0)
      const overtimePay = overtimeHours * (employee.hourly_rate || 0) * 1.5
      
      // Calculate deductions based on performance
      let deductions = 0
      const lateShifts = shiftLogs.filter(log => log.is_late).length
      const noShowShifts = shiftLogs.filter(log => log.is_no_show).length
      
      deductions += lateShifts * 500 // PKR 500 per late shift
      deductions += noShowShifts * 1000 // PKR 1000 per no-show
      
      // Calculate bonuses based on performance
      let bonuses = 0
      const avgPerformance = shiftLogs.length > 0 
        ? shiftLogs.reduce((sum, log) => sum + (log.performance_rating || 0), 0) / shiftLogs.length
        : 0
      
      if (avgPerformance >= 4.5) {
        bonuses += 1000 // PKR 1000 bonus for high performance
      }
      
      // Get existing deductions and bonuses from database
      const deductionsResult = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total_deductions
        FROM payroll_deductions
        WHERE employee_id = $1
      `, [employee.employee_id])
      
      const bonusesResult = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total_bonuses
        FROM payroll_bonuses
        WHERE employee_id = $1
      `, [employee.employee_id])
      
      const manualDeductions = deductionsResult.rows[0].total_deductions
      const manualBonuses = bonusesResult.rows[0].total_bonuses
      
      // Calculate final amounts
      const grossPay = parseFloat(employee.base_salary) + parseFloat(hourlyPay) + parseFloat(overtimePay) + parseFloat(bonuses) + parseFloat(manualBonuses)
      const totalDeductions = parseFloat(deductions) + parseFloat(manualDeductions)
      const netPay = grossPay - totalDeductions
      
      console.log(`   Hours: ${totalHours} (${regularHours} regular, ${overtimeHours} overtime)`)
      console.log(`   Pay: PKR ${hourlyPay} + PKR ${overtimePay} overtime`)
      console.log(`   Deductions: PKR ${totalDeductions}`)
      console.log(`   Bonuses: PKR ${bonuses + manualBonuses}`)
      console.log(`   Net pay: PKR ${netPay}`)
      
      // Insert payroll record
      const insertResult = await pool.query(`
        INSERT INTO payroll_records (
          employee_id,
          payroll_period_id,
          base_salary,
          hours_worked,
          hourly_pay,
          overtime_hours,
          overtime_pay,
          bonus_amount,
          deductions_amount,
          gross_pay,
          net_pay,
          payment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
        RETURNING id
      `, [
        employee.employee_id,
        period.id,
        employee.base_salary,
        totalHours,
        hourlyPay,
        overtimeHours,
        overtimePay,
        bonuses + manualBonuses,
        totalDeductions,
        grossPay,
        netPay
      ])
      
      console.log(`   ✅ Record created with ID: ${insertResult.rows[0].id}`)
      
      totalEmployees++
      totalAmount += netPay
    }
    
    // Update period totals
    await pool.query(`
      UPDATE payroll_periods
      SET 
        total_employees = $2,
        total_payroll_amount = $3,
        status = 'processing',
        updated_at = NOW()
      WHERE id = $1
    `, [period.id, totalEmployees, totalAmount])
    
    console.log('\n📈 Payroll calculation completed!')
    console.log(`   Total employees processed: ${totalEmployees}`)
    console.log(`   Total payroll amount: PKR ${totalAmount}`)
    
    // Show summary
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COALESCE(SUM(net_pay), 0) as total_net_pay,
        COALESCE(SUM(deductions_amount), 0) as total_deductions,
        COALESCE(SUM(bonus_amount), 0) as total_bonuses
      FROM payroll_records
      WHERE payroll_period_id = $1
    `, [period.id])
    
    const summary = summaryResult.rows[0]
    console.log(`\n📊 Final summary:`)
    console.log(`   Total records: ${summary.total_records}`)
    console.log(`   Total net pay: PKR ${summary.total_net_pay}`)
    console.log(`   Total deductions: PKR ${summary.total_deductions}`)
    console.log(`   Total bonuses: PKR ${summary.total_bonuses}`)
    
    console.log('\n✅ Payroll calculation test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error testing payroll calculation:', error)
  } finally {
    await pool.end()
  }
}

testPayrollDirect()
