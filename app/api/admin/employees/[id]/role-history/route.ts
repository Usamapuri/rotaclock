import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware, withRlsTenant } from '@/lib/api-auth'
import { query } from '@/lib/database'

async function _GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    // Get employee email if UUID is provided
    let email = id
    if (isUuid) {
      const employeeResult = await query(`
        SELECT email FROM employees WHERE id = $1
      `, [id])
      
      if (employeeResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Employee not found' },
          { status: 404 }
        )
      }
      email = employeeResult.rows[0].email
    }

    const result = await query(`
      SELECT 
        id,
        employee_id,
        employee_email,
        old_role,
        new_role,
        assigned_by,
        reason,
        effective_date,
        created_at
      FROM role_assignments
      WHERE employee_email = $1
      ORDER BY created_at DESC
    `, [email])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching role history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role history' },
      { status: 500 }
    )
  }
}

// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const GET = withRlsTenant(_GET)
