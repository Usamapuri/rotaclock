import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('period_id')

    if (!periodId) {
      return NextResponse.json({ error: 'Period ID is required' }, { status: 400 })
    }

    const periodResult = await query(`SELECT * FROM payroll_periods WHERE id = $1 AND tenant_id = $2`, [periodId, tenantContext.tenant_id])
    if (periodResult.rows.length === 0) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 })
    }

    const period = periodResult.rows[0]

    const employeesResult = await query(`
      SELECT 
        e.id, e.employee_code, e.email, e.first_name, e.last_name,
        COALESCE(e.hourly_rate, 0) as hourly_rate,
        COALESCE(es.base_salary, 20000) as base_salary
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.employee_code AND es.tenant_id = e.tenant_id
      WHERE e.is_active = true AND e.tenant_id = $1
    `, [tenantContext.tenant_id])

    const employees = employeesResult.rows

    for (const employee of employees) {
      const shiftLogsResult = await query(`
        SELECT 
          COALESCE(te.total_hours, 0) as hours_worked,
          $1 as hourly_rate,
          NULL::int as performance_rating,
          FALSE as is_late,
          FALSE as is_no_show,
          COALESCE(te.total_hours, 0) * $1 as total_pay
        FROM time_entries te
        WHERE te.employee_id = $2 
          AND te.clock_in >= $3 
          AND te.clock_in <= $4
          AND te.status = 'completed'
      `, [employee.hourly_rate, employee.id, period.start_date, period.end_date])

      const shiftLogs = shiftLogsResult.rows

      const totalHours = shiftLogs.reduce((sum, log) => sum + (parseFloat(log.hours_worked) || 0), 0)
      const totalPay = shiftLogs.reduce((sum, log) => sum + (parseFloat(log.total_pay) || 0), 0)
      const weeksInPeriod = Math.ceil((new Date(period.end_date).getTime() - new Date(period.start_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
      const maxRegularHours = weeksInPeriod * 40
      const overtimeHours = Math.max(0, totalHours - maxRegularHours)
      const regularHours = totalHours - overtimeHours

      const hourlyPay = regularHours * (employee.hourly_rate || 0)
      const overtimePay = overtimeHours * (employee.hourly_rate || 0) * 1.5

      let deductions = 0
      const lateShifts = shiftLogs.filter(log => log.is_late).length
      const noShowShifts = shiftLogs.filter(log => log.is_no_show).length
      deductions += lateShifts * 500
      deductions += noShowShifts * 1000

      let bonuses = 0
      const avgPerformance = shiftLogs.length > 0 ? shiftLogs.reduce((sum, log) => sum + (log.performance_rating || 0), 0) / shiftLogs.length : 0
      if (avgPerformance >= 4.5) {
        bonuses += 1000
      }

      const totalCalculatedPay = totalPay + bonuses - deductions

      await query(`
        INSERT INTO payroll_records (
          employee_id, payroll_period_id, base_salary, hours_worked, hourly_pay, overtime_hours,
          overtime_pay, bonus_amount, deductions_amount, gross_pay, net_pay, payment_status, tenant_id, organization_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'calculated', $12, $13)
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
          payment_status = EXCLUDED.payment_status,
          updated_at = NOW()
      `, [
        employee.employee_code,
        periodId,
        employee.base_salary,
        totalHours,
        hourlyPay,
        overtimeHours,
        overtimePay,
        bonuses,
        deductions,
        totalPay,
        totalCalculatedPay,
        tenantContext.tenant_id,
        tenantContext.organization_id,
      ])
    }

    return NextResponse.json({ success: true, message: 'Payroll calculated successfully', data: { period_id: periodId, employees_processed: employees.length } })
  } catch (error) {
    console.error('Error calculating payroll:', error)
    return NextResponse.json({ error: 'Failed to calculate payroll' }, { status: 500 })
  }
}
