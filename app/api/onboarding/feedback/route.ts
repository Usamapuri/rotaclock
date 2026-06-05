import { type NextRequest, NextResponse } from "next/server"
import { createApiAuthMiddleware } from "@/lib/api-auth"
import { query } from "@/lib/database"
import { getTenantContext } from "@/lib/tenant"

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

    const { process_id, step_id, rating, feedback_text, feedback_type, submitted_by } = body

    const feedbackResult = await query(`
      INSERT INTO onboarding_feedback (process_id, step_id, rating, feedback_text, feedback_type, submitted_by, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [process_id, step_id, rating, feedback_text, feedback_type, submitted_by, tenantContext.tenant_id])

    return NextResponse.json({ feedback: feedbackResult.rows[0] })
  } catch (error) {
    console.error("Error creating feedback:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
    const processId = searchParams.get("process_id")

    const params: any[] = [tenantContext.tenant_id]
    let sql = `
      SELECT
        of.*,
        json_build_object('employee_name', op.employee_name) as onboarding_processes,
        json_build_object('title', os.title) as onboarding_steps
      FROM onboarding_feedback of
      LEFT JOIN onboarding_processes op ON of.process_id = op.id AND op.tenant_id = $1
      LEFT JOIN onboarding_steps os ON of.step_id = os.id AND os.tenant_id = $1
      WHERE of.tenant_id = $1
    `

    if (processId) {
      params.push(processId)
      sql += ` AND of.process_id = $${params.length}`
    }

    sql += ` ORDER BY of.created_at DESC`

    const feedbackResult = await query(sql, params)

    return NextResponse.json({ feedback: feedbackResult.rows })
  } catch (error) {
    console.error("Error fetching feedback:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
