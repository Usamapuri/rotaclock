const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

const query = async (text, params) => {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

const testPayrollCalculation = async () => {
  try {
    console.log('🧪 Testing payroll calculation manually...')
    
    // Get the latest payroll period
    const periodResult = await query(`
      SELECT * FROM payroll_periods 
      ORDER BY created_at DESC 
      LIMIT 1
    `)
    
    if (periodResult.rows.length === 0) {
      console.log('❌ No payroll periods found')
      return
    }
    
    const period = periodResult.rows[0]
    console.log(`📅 Using period: ${period.period_name} (ID: ${period.id})`)
    console.log(`   Start: ${period.start_date}, End: ${period.end_date}`)
    
    // Get all active employees
    const employeesResult = await query(`
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
    console.log(`👥 Found ${employees.length} active employees`)
    
    // Calculate payroll for each employee
    for (const employee of employees) {
      console.log(`\n💰 Calculating for ${employee.first_name} ${employee.last_name} (${employee.employee_id})`)
      
      // Get shift logs for this employee in the period
      const shiftLogsResult = await query(`
        SELECT 
          COALESCE(total_shift_hours, 0) as hours_worked,
          performance_rating,
          is_late,
          is_no_show
        FROM shift_logs
        WHERE employee_id = $1 
        AND clock_in_time >= $2 
        AND clock_in_time <= $3
        AND status = 'completed'
      `, [employee.id, period.start_date, period.end_date])
      
      const shiftLogs = shiftLogsResult.rows
      console.log(`   📊 Found ${shiftLogs.length} shift logs`)
      
      // Calculate total hours worked
      const totalHours = shiftLogs.reduce((sum, log) => {
        const hours = parseFloat(log.hours_worked) || 0
        return sum + hours
      }, 0)
      
      console.log(`   ⏰ Total hours: ${totalHours}`)
      
      // Calculate overtime (hours over 40 per week)
      const weeksInPeriod = Math.ceil((new Date(period.end_date) - new Date(period.start_date)) / (1000 * 60 * 60 * 24 * 7))
      const maxRegularHours = weeksInPeriod * 40
      const overtimeHours = Math.max(0, totalHours - maxRegularHours)
      const regularHours = totalHours - overtimeHours
      
      console.log(`   📈 Regular hours: ${regularHours}, Overtime: ${overtimeHours}`)
      
      // Calculate pay
      const hourlyPay = regularHours * (employee.hourly_rate || 0)
      const overtimePay = overtimeHours * (employee.hourly_rate || 0) * 1.5
      
      console.log(`   💵 Hourly pay: PKR ${hourlyPay}, Overtime: PKR ${overtimePay}`)
      
      // Calculate deductions based on performance
      let deductions = 0
      const lateShifts = shiftLogs.filter(log => log.is_late).length
      const noShowShifts = shiftLogs.filter(log => log.is_no_show).length
      
      deductions += lateShifts * 500 // PKR 500 per late shift
      deductions += noShowShifts * 1000 // PKR 1000 per no-show
      
      console.log(`   ⚠️  Deductions: PKR ${deductions} (${lateShifts} late, ${noShowShifts} no-shows)`)
      
      // Calculate bonuses based on performance
      let bonuses = 0
      const avgPerformance = shiftLogs.length > 0 
        ? shiftLogs.reduce((sum, log) => sum + (log.performance_rating || 0), 0) / shiftLogs.length
        : 0
      
      if (avgPerformance >= 4.5) {
        bonuses += 1000 // PKR 1000 bonus for high performance
      }
      
      console.log(`   🎯 Performance bonus: PKR ${bonuses} (avg rating: ${avgPerformance.toFixed(2)})`)
      
      // Get existing deductions and bonuses from database
      const deductionsResult = await query(`
        SELECT COALESCE(SUM(amount), 0) as total_deductions
        FROM payroll_deductions
        WHERE employee_id = $1
      `, [employee.employee_id])
      
      const bonusesResult = await query(`
        SELECT COALESCE(SUM(amount), 0) as total_bonuses
        FROM payroll_bonuses
        WHERE employee_id = $1
      `, [employee.employee_id])
      
      const manualDeductions = deductionsResult.rows[0].total_deductions
      const manualBonuses = bonusesResult.rows[0].total_bonuses
      
      console.log(`   📝 Manual deductions: PKR ${manualDeductions}, Manual bonuses: PKR ${manualBonuses}`)
      
      // Calculate final amounts
      const grossPay = parseFloat(employee.base_salary) + parseFloat(hourlyPay) + parseFloat(overtimePay) + parseFloat(bonuses) + parseFloat(manualBonuses)
      const totalDeductions = parseFloat(deductions) + parseFloat(manualDeductions)
      const netPay = grossPay - totalDeductions
      
      console.log(`   💰 Base salary: PKR ${employee.base_salary}`)
      console.log(`   💰 Gross pay: PKR ${grossPay}`)
      console.log(`   💰 Net pay: PKR ${netPay}`)
      
      // Insert or update payroll record
      try {
        const insertResult = await query(`
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
          bonuses + manualBonuses,
          totalDeductions,
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
    const summaryResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        COALESCE(SUM(net_pay), 0) as total_payroll,
        COALESCE(SUM(hours_worked), 0) as total_hours,
        COALESCE(SUM(bonus_amount), 0) as total_bonuses,
        COALESCE(SUM(deductions_amount), 0) as total_deductions
      FROM payroll_records
      WHERE payroll_period_id = $1
    `, [period.id])
    
    const summary = summaryResult.rows[0]
    console.log(`   Total records: ${summary.total_records}`)
    console.log(`   Total payroll: PKR ${summary.total_payroll}`)
    console.log(`   Total hours: ${summary.total_hours}`)
    console.log(`   Total bonuses: PKR ${summary.total_bonuses}`)
    console.log(`   Total deductions: PKR ${summary.total_deductions}`)
    
  } catch (error) {
    console.error('❌ Error testing payroll calculation:', error)
  } finally {
    await pool.end()
  }
}

testPayrollCalculation()
