import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const is_active = searchParams.get('is_active')

    // Build query
    let queryText = `
      SELECT 
        id,
        employee_code as employee_id,
        first_name,
        last_name,
        email,
        department,
        job_position as position,
        role,
        is_active,
        is_online,
        last_online
      FROM employees_new
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    // Only show active employees by default
    if (is_active === null || is_active === 'true') {
      queryText += ` AND is_active = true`
    }

    if (department && department !== 'all') {
      queryText += ` AND department = $${paramIndex++}`
      params.push(department)
    }

    if (role && role !== 'all') {
      queryText += ` AND role = $${paramIndex++}`
      params.push(role)
    }

    if (search) {
      queryText += ` AND (
        LOWER(first_name) LIKE LOWER($${paramIndex}) OR
        LOWER(last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(employee_code) LIKE LOWER($${paramIndex}) OR
        LOWER(email) LIKE LOWER($${paramIndex})
      )`
      params.push(`%${search}%`)
      paramIndex++
    }

    // Add ordering
    queryText += ` ORDER BY first_name, last_name`

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
