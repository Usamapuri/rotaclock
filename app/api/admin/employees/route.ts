import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

const authMiddleware = createApiAuthMiddleware()

/**
 * GET /api/admin/employees
 * List all employees for admin impersonation
 */
export async function GET(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only admins can access this endpoint' }, { status: 403 })
    }

    const tenant = await getTenantContext(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const is_active = searchParams.get('is_active')

    // Build query
    let queryText = `
      SELECT 
        e.id,
        e.employee_code as employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.job_position as position,
        e.role,
        e.is_active,
        e.is_online,
        e.last_online
      FROM employees e
      WHERE e.tenant_id = $1::uuid
    `
    const params: any[] = [tenant.tenant_id]
    let paramIndex = 2

    // Only show active employees by default
    if (is_active === null || is_active === 'true') {
      queryText += ` AND e.is_active = true`
    }

    if (department && department !== 'all') {
      queryText += ` AND e.department = $${paramIndex++}`
      params.push(department)
    }

    if (role && role !== 'all') {
      queryText += ` AND e.role = $${paramIndex++}`
      params.push(role)
    }

    if (search) {
      queryText += ` AND (
        LOWER(e.first_name) LIKE LOWER($${paramIndex}) OR
        LOWER(e.last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(e.employee_code) LIKE LOWER($${paramIndex}) OR
        LOWER(e.email) LIKE LOWER($${paramIndex})
      )`
      params.push(`%${search}%`)
      paramIndex++
    }

    // Add ordering
    queryText += ` ORDER BY e.first_name, e.last_name`

    const result = await query(queryText, params)
    const employees = result.rows

    return NextResponse.json({
      success: true,
      employees: employees
    })

  } catch (error) {
    console.error('Error in GET /api/admin/employees:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
