import { NextRequest, NextResponse } from 'next/server'
import { getBreakLogs } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const status = searchParams.get('status')

    // Build filters
    const filters: any = {}
    if (employeeId) {
      filters.employee_id = employeeId
    }
    if (startDate) filters.start_date = startDate
    if (endDate) filters.end_date = endDate
    if (status) filters.status = status

    // Get break logs
    const breakLogs = await getBreakLogs(filters)

    return NextResponse.json({
      success: true,
      data: breakLogs
    })

  } catch (error) {
    console.error('Error getting break logs:', error)
    return NextResponse.json(
      { error: 'Failed to get break logs' },
      { status: 500 }
    )
  }
}
