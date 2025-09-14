import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isAdmin } from '@/lib/api-auth'
import { z } from 'zod'
import { getTenantContext } from '@/lib/tenant'

const addMemberSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID')
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await getTenantContext(user!.id)
    if (!tenant) return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })

    const { id: teamId } = params

    const result = await query(`
      SELECT e.id, e.first_name, e.last_name, e.email, e.job_position as position, e.employee_code as employee_id, e.created_at as joined_date, 'member' as role
      FROM employees e
      WHERE e.team_id = $1 AND e.is_active = true AND e.tenant_id = $2
      ORDER BY e.first_name, e.last_name
    `, [teamId, tenant.tenant_id])

    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/admin/teams/[id]/members error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await getTenantContext(user!.id)
    if (!tenant) return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })

    const { id: teamId } = params
    const body = await request.json()
    const { employee_id } = addMemberSchema.parse(body)

    const teamCheck = await query('SELECT id FROM teams WHERE id = $1 AND is_active = true AND tenant_id = $2', [teamId, tenant.tenant_id])
    if (teamCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const employeeCheck = await query('SELECT id, team_id FROM employees WHERE id = $1 AND is_active = true AND tenant_id = $2', [employee_id, tenant.tenant_id])
    if (employeeCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    if (employeeCheck.rows[0].team_id) {
      return NextResponse.json({ error: 'Employee is already assigned to a team' }, { status: 400 })
    }

    const result = await query(
      `UPDATE employees SET team_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [teamId, employee_id, tenant.tenant_id]
    )

    return NextResponse.json({ success: true, data: result.rows[0], message: 'Team member added successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error adding team member:', error)
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 })
  }
}
