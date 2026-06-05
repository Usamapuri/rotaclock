import { type NextRequest, NextResponse } from "next/server"
import { createApiAuthMiddleware } from "@/lib/api-auth"
import { query } from "@/lib/database"
import { getTenantContext } from "@/lib/tenant"

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
    const processesResult = await query(`
      SELECT
        op.*,
        (
          SELECT json_agg(
            json_build_object(
              'step_id', sc.step_id,
              'completed_at', sc.completed_at,
              'feedback', sc.feedback
            )
          )
          FROM step_completions sc
          JOIN onboarding_steps os ON os.id = sc.step_id
          WHERE sc.process_id = op.id AND os.tenant_id = $1
        ) as step_completions
      FROM onboarding_processes op
      WHERE op.tenant_id = $1
      ORDER BY op.created_at DESC
    `, [tenantContext.tenant_id])

    return NextResponse.json({ processes: processesResult.rows })
  } catch (error) {
    console.error("Error fetching processes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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

    const { employee_id, employee_name, template_id, template_name, start_date, assigned_mentor, notes } = body

    // Calculate expected completion date (assuming 5 business days)
    const startDate = new Date(start_date)
    const expectedCompletionDate = new Date(startDate)
    expectedCompletionDate.setDate(startDate.getDate() + 5)

    const processResult = await query(`
      INSERT INTO onboarding_processes (
        employee_id,
        employee_name,
        template_id,
        template_name,
        start_date,
        expected_completion_date,
        assigned_mentor,
        notes,
        status,
        progress,
        tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      employee_id,
      employee_name,
      template_id,
      template_name,
      start_date,
      expectedCompletionDate.toISOString().split("T")[0],
      assigned_mentor,
      notes,
      "not-started",
      0,
      tenantContext.tenant_id
    ])

    return NextResponse.json({ process: processResult.rows[0] })
  } catch (error) {
    console.error("Error creating process:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
