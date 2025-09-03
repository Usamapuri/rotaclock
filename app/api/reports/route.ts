import { NextRequest, NextResponse } from 'next/server'
import { getAttendanceStats, getPayrollStats, getDepartmentStats } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

/**
 * GET /api/reports
 * Get various reports based on type parameter
 */
export async function GET(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const department = searchParams.get('department')

    if (!type) {
      return NextResponse.json({ error: 'Report type is required' }, { status: 400 })
    }

    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
    }

    // Build filters
    const filters: any = {
      start_date,
      end_date,
      tenant_id: tenantContext.tenant_id,
    }
    if (department) filters.department = department

    let data: any

    switch (type) {
      case 'overview':
        // For overview, return a combination of stats
        const [attendanceStats, payrollStats, departmentStats] = await Promise.all([
          getAttendanceStats(filters),
          getPayrollStats(filters),
          getDepartmentStats(filters),
        ])
        data = {
          attendance: attendanceStats,
          payroll: payrollStats,
          departments: departmentStats,
        }
        break
      case 'employees':
        // For employees report, return department stats (which includes employee data)
        data = await getDepartmentStats(filters)
        break
      case 'attendance':
        data = await getAttendanceStats(filters)
        break
      case 'payroll':
        data = await getPayrollStats(filters)
        break
      case 'departments':
        data = await getDepartmentStats(filters)
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    return NextResponse.json({
      data,
      report_type: type,
      filters: {
        start_date,
        end_date,
        department,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
