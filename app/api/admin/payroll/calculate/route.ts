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
      // Get APPROVED shift logs for this employee in the period
      // Only shifts with approval_status = 'approved' are counted for payroll
      const shiftLogsResult = await query(`
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
      `, [employee.hourly_rate, employee.id, period.start_date, period.end_date])

      const shiftLogs = shiftLogsResult.rows

      // Calculate total hours worked and pay from approved shifts
      const totalHours = shiftLogs.reduce((sum, log) => {
        const hours = parseFloat(log.hours_worked) || 0
        return sum + hours
      }, 0)

      const totalPay = shiftLogs.reduce((sum, log) => {
        const pay = parseFloat(log.total_pay) || 0
        return sum + pay
      }, 0)
      
      // Calculate overtime (hours over 40 per week)
      const weeksInPeriod = Math.ceil((new Date(period.end_date).getTime() - new Date(period.start_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
      const maxRegularHours = weeksInPeriod * 40
      const overtimeHours = Math.max(0, totalHours - maxRegularHours)
      const regularHours = totalHours - overtimeHours

      // Calculate pay (use approved rates and hours)
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

      // Calculate total pay
      const totalCalculatedPay = totalPay + bonuses - deductions

      // Insert or update payroll record
      await query(`
        INSERT INTO payroll_records (
          employee_id, 
          period_id, 
          total_hours, 
          regular_hours, 
          overtime_hours,
          hourly_rate,
          regular_pay,
          overtime_pay,
          total_pay,
          bonuses,
          deductions,
          net_pay,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (employee_id, period_id) 
        DO UPDATE SET
          total_hours = EXCLUDED.total_hours,
          regular_hours = EXCLUDED.regular_hours,
          overtime_hours = EXCLUDED.overtime_hours,
          hourly_rate = EXCLUDED.hourly_rate,
          regular_pay = EXCLUDED.regular_pay,
          overtime_pay = EXCLUDED.overtime_pay,
          total_pay = EXCLUDED.total_pay,
          bonuses = EXCLUDED.bonuses,
          deductions = EXCLUDED.deductions,
          net_pay = EXCLUDED.net_pay,
          updated_at = NOW()
      `, [
        employee.id,
        periodId,
        totalHours,
        regularHours,
        overtimeHours,
        employee.hourly_rate,
        hourlyPay,
        overtimePay,
        totalPay,
        bonuses,
        deductions,
        totalCalculatedPay,
        'calculated'
      ])
    }

    return NextResponse.json({
      success: true,
      message: 'Payroll calculated successfully',
      data: {
        period_id: periodId,
        employees_processed: employees.length
      }
    })

  } catch (error) {
    console.error('Error calculating payroll:', error)
    return NextResponse.json(
      { error: 'Failed to calculate payroll' },
      { status: 500 }
    )
  }
}
