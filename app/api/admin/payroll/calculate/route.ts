import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('period_id')

    if (!periodId) {
      return NextResponse.json(
        { error: 'Period ID is required' },
        { status: 400 }
      )
    }

    // Get the payroll period details
    const periodResult = await query(`
      SELECT * FROM payroll_periods WHERE id = $1
    `, [periodId])

    if (periodResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    const period = periodResult.rows[0]

    // Get all active employees (new schema)
    const employeesResult = await query(`
      SELECT 
        e.id,
        e.employee_code,
        e.email,
        e.first_name,
        e.last_name,
        COALESCE(e.hourly_rate, 0) as hourly_rate,
        COALESCE(es.base_salary, 20000) as base_salary
      FROM employees_new e
      LEFT JOIN employee_salaries es ON es.employee_id = e.employee_code
      WHERE e.is_active = true
    `)

    const employees = employeesResult.rows

    // Calculate payroll for each employee
    for (const employee of employees) {
      // Get APPROVED time entries for this employee in the period
      // Only entries that have an approval record with status = 'approved' are counted
      const shiftLogsResult = await query(`
        SELECT 
          COALESCE(sl.total_shift_hours, 0) as hours_worked,
          sl.performance_rating,
          sl.is_late,
          sl.is_no_show
        FROM shift_logs sl
        JOIN time_entry_approvals tea ON tea.time_entry_id = sl.id AND tea.status = 'approved'
        WHERE sl.employee_id = $1 
          AND sl.clock_in_time >= $2 
          AND sl.clock_in_time <= $3
          AND sl.status = 'completed'
      `, [employee.id, period.start_date, period.end_date])

      const shiftLogs = shiftLogsResult.rows

      // Calculate total hours worked
      const totalHours = shiftLogs.reduce((sum, log) => {
        const hours = parseFloat(log.hours_worked) || 0
        return sum + hours
      }, 0)
      
      // Calculate overtime (hours over 40 per week)
      const weeksInPeriod = Math.ceil((new Date(period.end_date).getTime() - new Date(period.start_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
      const maxRegularHours = weeksInPeriod * 40
      const overtimeHours = Math.max(0, totalHours - maxRegularHours)
      const regularHours = totalHours - overtimeHours

      // Calculate pay
      const hourlyPay = regularHours * (employee.hourly_rate || 0)
      const overtimePay = overtimeHours * (employee.hourly_rate || 0) * 1.5 // 1.5x overtime rate

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

      // Get existing deductions and bonuses from database using email
      const deductionsResult = await query(`
        SELECT COALESCE(SUM(amount), 0) as total_deductions
        FROM payroll_deductions
        WHERE employee_email = $1
      `, [employee.email])

      const bonusesResult = await query(`
        SELECT COALESCE(SUM(amount), 0) as total_bonuses
        FROM payroll_bonuses
        WHERE employee_email = $1
      `, [employee.email])

      const manualDeductions = deductionsResult.rows[0].total_deductions
      const manualBonuses = bonusesResult.rows[0].total_bonuses

      // Calculate final amounts
      const grossPay = Number(employee.base_salary) + Number(hourlyPay) + Number(overtimePay) + Number(bonuses) + Number(manualBonuses)
      const totalDeductions = Number(deductions) + Number(manualDeductions)
      const netPay = grossPay - totalDeductions

      // Insert or update payroll record using both employee_id and email
      await query(`
        INSERT INTO payroll_records (
          employee_id,
          employee_email,
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
        ON CONFLICT (employee_id, payroll_period_id) 
        DO UPDATE SET
          employee_email = EXCLUDED.employee_email,
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
      `, [
        employee.employee_code,
        employee.email,
        periodId,
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
    }

    // Update period totals
    const totalResult = await query(`
      SELECT 
        COUNT(*) as total_employees,
        COALESCE(SUM(net_pay), 0) as total_amount
      FROM payroll_records
      WHERE payroll_period_id = $1
    `, [periodId])

    const totals = totalResult.rows[0]

    await query(`
      UPDATE payroll_periods
      SET 
        total_employees = $2,
        total_payroll_amount = $3,
        status = 'processing',
        updated_at = NOW()
      WHERE id = $1
    `, [periodId, totals.total_employees, totals.total_amount])

    return NextResponse.json({
      success: true,
      message: 'Payroll calculated successfully',
      total_employees: totals.total_employees,
      total_amount: totals.total_amount
    })

  } catch (error) {
    console.error('Error calculating payroll:', error)
    return NextResponse.json(
      { error: 'Failed to calculate payroll' },
      { status: 500 }
    )
  }
}
