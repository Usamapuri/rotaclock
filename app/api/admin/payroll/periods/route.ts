import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        id,
        period_name,
        start_date,
        end_date,
        status,
        total_employees,
        total_payroll_amount,
        created_at,
        updated_at
      FROM payroll_periods
      ORDER BY start_date DESC
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching payroll periods:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll periods' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { period_name, start_date, end_date } = await request.json()

    if (!period_name || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Period name, start date, and end date are required' },
        { status: 400 }
      )
    }

    const result = await query(`
      INSERT INTO payroll_periods (
        period_name, start_date, end_date, status
      ) VALUES ($1, $2, $3, 'open')
      RETURNING *
    `, [period_name, start_date, end_date])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating payroll period:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll period' },
      { status: 500 }
    )
  }
}
