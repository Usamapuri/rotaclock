import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { employee_id, payroll_period_id, amount, reason, bonus_type } = await request.json()

    if (!employee_id || !payroll_period_id || !amount || !reason) {
      return NextResponse.json(
        { error: 'Employee ID, period ID, amount, and reason are required' },
        { status: 400 }
      )
    }

    // Insert the bonus
    const result = await query(`
      INSERT INTO payroll_bonuses (
        employee_id,
        payroll_period_id,
        amount,
        reason,
        bonus_type,
        applied_by
      ) VALUES ($1, $2, $3, $4, $5, 'admin')
      RETURNING *
    `, [employee_id, payroll_period_id, amount, reason, bonus_type || 'performance'])

    // Update the payroll record to reflect the new bonus
    await query(`
      UPDATE payroll_records
      SET 
        bonus_amount = (
          SELECT COALESCE(SUM(amount), 0)
          FROM payroll_bonuses
          WHERE employee_id = $1 AND payroll_period_id = $2
        ),
        gross_pay = base_salary + hourly_pay + overtime_pay + (
          SELECT COALESCE(SUM(amount), 0)
          FROM payroll_bonuses
          WHERE employee_id = $1 AND payroll_period_id = $2
        ),
        net_pay = (base_salary + hourly_pay + overtime_pay + (
          SELECT COALESCE(SUM(amount), 0)
          FROM payroll_bonuses
          WHERE employee_id = $1 AND payroll_period_id = $2
        )) - deductions_amount,
        updated_at = NOW()
      WHERE employee_id = $1 AND payroll_period_id = $2
    `, [employee_id, payroll_period_id])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error adding bonus:', error)
    return NextResponse.json(
      { error: 'Failed to add bonus' },
      { status: 500 }
    )
  }
}
