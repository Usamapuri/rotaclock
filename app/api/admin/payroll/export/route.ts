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

    // Get payroll period details
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

    // Get payroll records with employee details
    const recordsResult = await query(`
      SELECT 
        e.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        e.email,
        e.department,
        e.job_position as position,
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
        pr.notes
      FROM payroll_records pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      WHERE pr.payroll_period_id = $1
      ORDER BY e.first_name, e.last_name
    `, [periodId])

    const records = recordsResult.rows

    // Generate CSV content
    const csvHeaders = [
      'Employee ID',
      'Employee Name',
      'Email',
      'Department',
      'Position',
      'Base Salary (PKR)',
      'Hours Worked',
      'Hourly Pay (PKR)',
      'Overtime Hours',
      'Overtime Pay (PKR)',
      'Bonuses (PKR)',
      'Deductions (PKR)',
      'Gross Pay (PKR)',
      'Net Pay (PKR)',
      'Payment Status',
      'Payment Date',
      'Notes'
    ].join(',')

    const csvRows = records.map(record => [
      record.employee_id,
      `"${record.employee_name}"`,
      record.email,
      record.department,
      record.position,
      record.base_salary || 0,
      record.hours_worked || 0,
      record.hourly_pay || 0,
      record.overtime_hours || 0,
      record.overtime_pay || 0,
      record.bonus_amount || 0,
      record.deductions_amount || 0,
      record.gross_pay || 0,
      record.net_pay || 0,
      record.payment_status || 'pending',
      record.payment_date || '',
      record.notes ? `"${record.notes.replace(/"/g, '""')}"` : ''
    ].join(','))

    const csvContent = [csvHeaders, ...csvRows].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payroll_${period.period_name}_${period.start_date}_to_${period.end_date}.csv"`,
      },
    })

  } catch (error) {
    console.error('Error exporting payroll:', error)
    return NextResponse.json(
      { error: 'Failed to export payroll data' },
      { status: 500 }
    )
  }
}
