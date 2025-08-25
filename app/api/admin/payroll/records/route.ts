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

    // Ensure table exists (idempotent)
    await query(`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        payroll_period_id INTEGER,
        base_salary DECIMAL(10,2) NOT NULL,
        hours_worked DECIMAL(8,2) DEFAULT 0.00,
        hourly_pay DECIMAL(10,2) DEFAULT 0.00,
        overtime_hours DECIMAL(8,2) DEFAULT 0.00,
        overtime_pay DECIMAL(10,2) DEFAULT 0.00,
        bonus_amount DECIMAL(10,2) DEFAULT 0.00,
        deductions_amount DECIMAL(10,2) DEFAULT 0.00,
        gross_pay DECIMAL(10,2) DEFAULT 0.00,
        net_pay DECIMAL(10,2) DEFAULT 0.00,
        payment_status VARCHAR(20) DEFAULT 'pending',
        payment_date DATE,
        payment_method VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)

    const result = await query(`
      SELECT 
        pr.id,
        pr.employee_id,
        (en.first_name || ' ' || en.last_name) as employee_name,
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
      LEFT JOIN employees_new en ON pr.employee_id = en.employee_code
      WHERE pr.payroll_period_id = $1
      ORDER BY en.first_name, en.last_name
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
