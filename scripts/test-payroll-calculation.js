const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function testPayrollCalculation() {
  try {
    console.log('🧪 Testing payroll calculation...\n')
    
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
    console.log(`📅 Using payroll period: ${period.period_name} (${period.start_date} to ${period.end_date})`)
    
    // Get employees with their salary data
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
      LIMIT 3
    `)
    
    console.log(`\n👥 Found ${employeesResult.rows.length} active employees`)
    
    // Test payroll calculation for each employee
    for (const employee of employeesResult.rows) {
      console.log(`\n📊 Calculating payroll for ${employee.first_name} ${employee.last_name} (${employee.employee_id})`)
      
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
      console.log(`   Total hours worked: ${totalHours}`)
      
      // Calculate overtime (hours over 40 per week)
      const weeksInPeriod = Math.ceil((new Date(period.end_date) - new Date(period.start_date)) / (1000 * 60 * 60 * 24 * 7))
      const maxRegularHours = weeksInPeriod * 40
      const overtimeHours = Math.max(0, totalHours - maxRegularHours)
      const regularHours = totalHours - overtimeHours
      
      console.log(`   Regular hours: ${regularHours}, Overtime hours: ${overtimeHours}`)
      
      // Calculate pay
      const hourlyPay = regularHours * (employee.hourly_rate || 0)
      const overtimePay = overtimeHours * (employee.hourly_rate || 0) * 1.5
      
      console.log(`   Hourly pay: PKR ${hourlyPay}, Overtime pay: PKR ${overtimePay}`)
      
      // Calculate deductions based on performance
      let deductions = 0
      const lateShifts = shiftLogs.filter(log => log.is_late).length
      const noShowShifts = shiftLogs.filter(log => log.is_no_show).length
      
      deductions += lateShifts * 500 // PKR 500 per late shift
      deductions += noShowShifts * 1000 // PKR 1000 per no-show
      
      console.log(`   Deductions: PKR ${deductions} (${lateShifts} late shifts, ${noShowShifts} no-shows)`)
      
      // Calculate bonuses based on performance
      let bonuses = 0
      const avgPerformance = shiftLogs.length > 0 
        ? shiftLogs.reduce((sum, log) => sum + (log.performance_rating || 0), 0) / shiftLogs.length
        : 0
      
      if (avgPerformance >= 4.5) {
        bonuses += 1000 // PKR 1000 bonus for high performance
      }
      
      console.log(`   Bonuses: PKR ${bonuses} (avg performance: ${avgPerformance.toFixed(2)})`)
      
      // Calculate final amounts
      const grossPay = parseFloat(employee.base_salary) + parseFloat(hourlyPay) + parseFloat(overtimePay) + parseFloat(bonuses)
      const netPay = grossPay - parseFloat(deductions)
      
      console.log(`   Base salary: PKR ${employee.base_salary}`)
      console.log(`   Gross pay: PKR ${grossPay}`)
      console.log(`   Net pay: PKR ${netPay}`)
      
      // Insert payroll record
      try {
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
          ON CONFLICT (employee_id, payroll_period_id) 
          DO UPDATE SET
            base_salary = EXCLUDED.base_salary,
            hours_worked = EXCLUDED.hours_worked,
            hourly_pay = EXCLUDED.hourly_pay,
            overtime_hours = EXCLUDED.overtime_hours,
            overtime_pay = EXCLUDED.overtime_pay,
            bonus_amount = EXCLUDED.bonus_amount,
            deductions_amount = EXCLUDED.deductions_amount,
            gross_pay = EXCLUDED.gross_pay,
            net_pay = EXCLUDED.net_pay,
            updated_at = NOW()
          RETURNING id
        `, [
          employee.employee_id,
          period.id,
          employee.base_salary,
          totalHours,
          hourlyPay,
          overtimeHours,
          overtimePay,
          bonuses,
          deductions,
          grossPay,
          netPay
        ])
        
        console.log(`   ✅ Payroll record created/updated with ID: ${insertResult.rows[0].id}`)
        
      } catch (error) {
        console.log(`   ❌ Failed to create payroll record: ${error.message}`)
      }
    }
    
    // Check final results
    console.log('\n📈 Final payroll summary:')
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
    console.log(`   Total records: ${summary.total_records}`)
    console.log(`   Total net pay: PKR ${summary.total_net_pay}`)
    console.log(`   Total deductions: PKR ${summary.total_deductions}`)
    console.log(`   Total bonuses: PKR ${summary.total_bonuses}`)
    
    console.log('\n✅ Payroll calculation test completed!')
    
  } catch (error) {
    console.error('❌ Error testing payroll calculation:', error)
  } finally {
    await pool.end()
  }
}

testPayrollCalculation()
