import { NextRequest, NextResponse } from 'next/server'
import { getShiftLogs } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenant = await getTenantContext(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
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

    // Enforce tenant scoping at the query level
    const shiftLogs = await getShiftLogs({ ...filters, tenant_id: tenant.tenant_id })

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
