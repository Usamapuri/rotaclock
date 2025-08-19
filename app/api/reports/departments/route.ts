import { NextRequest, NextResponse } from 'next/server'
import { getDepartmentStats } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

/**
 * GET /api/reports/departments
 * Get department statistics report
 */
export async function GET(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      end_date
    }

    const data = await getDepartmentStats(filters)

    return NextResponse.json({
      data,
      report_type: 'departments',
      filters: {
        start_date,
        end_date
      }
    })

  } catch (error) {
    console.error('Error in GET /api/reports/departments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
