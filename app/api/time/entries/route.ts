import { NextRequest, NextResponse } from 'next/server'
import { query, getTimeEntries } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'
import { getTenantContext } from '@/lib/tenant'

/**
 * GET /api/time/entries
 * Get time entries with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate and get tenant context
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
    const employee_id = searchParams.get('employee_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const status = searchParams.get('status')

    // Build filters
    const filters: any = { tenant_id: tenantContext.tenant_id }
    if (employee_id) filters.employee_id = employee_id
    if (start_date) filters.start_date = start_date
    if (end_date) filters.end_date = end_date
    if (status) filters.status = status

    // Get time entries
    const entries = await getTimeEntries(filters)

    return NextResponse.json({
      data: entries
    })

  } catch (error) {
    console.error('Error in GET /api/time/entries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 