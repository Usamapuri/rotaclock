import { NextRequest, NextResponse } from 'next/server'
import { getShiftLogs } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employee_id = searchParams.get('employee_id')
    const status = searchParams.get('status')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    // Build filters
    const filters: any = {}
    if (employee_id) filters.employee_id = employee_id
    if (status) filters.status = status
    if (start_date) filters.start_date = start_date
    if (end_date) filters.end_date = end_date

    // Get shift logs
    const shiftLogs = await getShiftLogs(filters)

    return NextResponse.json({
      success: true,
      data: shiftLogs
    })

  } catch (error) {
    console.error('Error in GET /api/shift-logs:', error)
    return NextResponse.json(
      { error: 'Failed to get shift logs' },
      { status: 500 }
    )
  }
}
