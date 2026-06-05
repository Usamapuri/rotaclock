import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { query } from '@/lib/database'
import { getTenantContext } from '@/lib/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const { id: teamId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const employeeId = searchParams.get('employee_id')

    let sql = `
      SELECT
        ta.*,
        e.first_name,
        e.last_name,
        e.employee_id
      FROM training_assignments ta
      JOIN employees e ON ta.employee_id = e.id AND e.tenant_id = ta.tenant_id
      WHERE e.team_id = $1 AND ta.tenant_id = $2 AND e.tenant_id = $2`
    const paramsArr: any[] = [teamId, tenantContext.tenant_id]
    let idx = 3

    if (status) { sql += ` AND ta.status = $${idx}`; paramsArr.push(status); idx++ }
    if (employeeId) { sql += ` AND ta.employee_id = $${idx}`; paramsArr.push(employeeId); idx++ }

    sql += ' ORDER BY ta.due_date ASC, e.first_name'

    const result = await query(sql, paramsArr)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/teams/[id]/training-assignments error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const { id: teamId } = await params
    const body = await request.json()
    const { employee_id, training_type, training_title, description, due_date } = body

    if (!employee_id || !training_type || !training_title) {
      return NextResponse.json({ error: 'employee_id, training_type, training_title are required' }, { status: 400 })
    }

    // ensure employee is in team
          const emp = await query('SELECT id FROM employees WHERE id = $1 AND team_id = $2 AND tenant_id = $3', [employee_id, teamId, tenantContext.tenant_id])
    if (emp.rows.length === 0) return NextResponse.json({ error: 'Employee not in team' }, { status: 400 })

    const result = await query(
      `INSERT INTO training_assignments (
        tenant_id, employee_id, assigned_by, training_type, training_title, description, due_date, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'assigned') RETURNING *`,
      [tenantContext.tenant_id, employee_id, null, training_type, training_title, description || null, due_date || null]
    )

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/teams/[id]/training-assignments error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
