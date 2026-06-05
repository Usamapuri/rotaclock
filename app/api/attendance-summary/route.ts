import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getAttendanceSummary } from '@/lib/database'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const employee_id = searchParams.get('employee_id')
    const department = searchParams.get('department')

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const filters: any = {
      tenant_id: tenantContext.tenant_id,
      start_date,
      end_date
    }

    if (employee_id) filters.employee_id = employee_id
    if (department) filters.department = department

    const attendanceData = await getAttendanceSummary(filters)

    // Calculate summary statistics
    const summary = {
      total_employees: attendanceData.length,
      total_shifts: attendanceData.reduce((sum, record) => sum + record.total_shifts, 0),
      total_hours_worked: attendanceData.reduce((sum, record) => sum + record.total_hours_worked, 0),
      total_break_time: attendanceData.reduce((sum, record) => sum + record.total_break_time, 0),
      total_late_count: attendanceData.reduce((sum, record) => sum + record.late_count, 0),
      total_no_show_count: attendanceData.reduce((sum, record) => sum + record.no_show_count, 0),
      total_on_time_count: attendanceData.reduce((sum, record) => sum + record.on_time_count, 0)
    }

    return NextResponse.json({
      success: true,
      data: attendanceData,
      summary
    })

  } catch (error) {
    console.error('Error fetching attendance summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance summary' },
      { status: 500 }
    )
  }
}
