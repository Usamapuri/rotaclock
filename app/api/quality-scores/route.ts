import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { query } from '@/lib/database'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const teamId = searchParams.get('team_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let sql = `
      SELECT
        qs.*,
        e.first_name,
        e.last_name,
        e.employee_id,
        evaluator.first_name as evaluator_first_name,
        evaluator.last_name as evaluator_last_name
      FROM quality_scores qs
      JOIN employees e ON qs.employee_id = e.id AND e.tenant_id = qs.tenant_id
      LEFT JOIN employees evaluator ON qs.evaluator_id = evaluator.id AND evaluator.tenant_id = qs.tenant_id
      WHERE qs.tenant_id = $1`
    const params: any[] = [tenantContext.tenant_id]
    let idx = 2

    if (employeeId) { sql += ` AND qs.employee_id = $${idx}`; params.push(employeeId); idx++ }
    if (teamId) { sql += ` AND e.team_id = $${idx}`; params.push(teamId); idx++ }
    if (startDate) { sql += ` AND qs.evaluation_date >= $${idx}`; params.push(startDate); idx++ }
    if (endDate) { sql += ` AND qs.evaluation_date <= $${idx}`; params.push(endDate); idx++ }

    sql += ' ORDER BY qs.evaluation_date DESC'

    const result = await query(sql, params)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/quality-scores error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const body = await request.json()
    const {
      employee_id,
      evaluator_id,
      call_id,
      score,
      communication_score,
      problem_solving_score,
      customer_service_score,
      compliance_score,
      feedback,
      recommendations
    } = body

    if (!employee_id || score == null) {
      return NextResponse.json({ error: 'employee_id and score are required' }, { status: 400 })
    }

    // Ensure the evaluated employee belongs to the caller's tenant.
    const emp = await query('SELECT id FROM employees WHERE id = $1 AND tenant_id = $2', [employee_id, tenantContext.tenant_id])
    if (emp.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found in tenant' }, { status: 404 })
    }

    const result = await query(
      `INSERT INTO quality_scores (
        tenant_id, employee_id, evaluator_id, call_id, evaluation_date, score,
        communication_score, problem_solving_score, customer_service_score,
        compliance_score, feedback, recommendations
      ) VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        tenantContext.tenant_id,
        employee_id,
        evaluator_id || null,
        call_id || null,
        score,
        communication_score || null,
        problem_solving_score || null,
        customer_service_score || null,
        compliance_score || null,
        feedback || null,
        recommendations || null,
      ]
    )

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/quality-scores error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
