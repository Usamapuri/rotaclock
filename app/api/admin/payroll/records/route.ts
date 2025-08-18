import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('period_id')

    if (!periodId) {
      return NextResponse.json(
        { error: 'Period ID is required' },
        { status: 400 }
      )
    }

    const result = await query(`
      SELECT 
        pr.id,
        pr.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        pr.payroll_period_id,
        pr.base_salary,
        pr.hours_worked,
        pr.hourly_pay,
        pr.overtime_hours,
        pr.overtime_pay,
        pr.bonus_amount,
        pr.deductions_amount,
        pr.gross_pay,
        pr.net_pay,
        pr.payment_status,
        pr.payment_date,
        pr.payment_method,
        pr.notes,
        pr.created_at,
        pr.updated_at
      FROM payroll_records pr
      LEFT JOIN employees e ON pr.employee_id = e.employee_id
      WHERE pr.payroll_period_id = $1
      ORDER BY e.first_name, e.last_name
    `, [periodId])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching payroll records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll records' },
      { status: 500 }
    )
  }
}
