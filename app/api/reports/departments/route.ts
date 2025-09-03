import { NextRequest, NextResponse } from 'next/server'
import { getDepartmentStats } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

/**
 * GET /api/reports/departments
 * Get department statistics report
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
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
    }

    // Build filters
    const filters: any = {
      start_date,
      end_date,
      tenant_id: tenantContext.tenant_id,
    }

    const data = await getDepartmentStats(filters)

    return NextResponse.json({
      data,
      report_type: 'departments',
      filters: {
        start_date,
        end_date,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/reports/departments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
