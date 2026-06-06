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

    const { process_id, step_id, completed_by, feedback } = body

    // Validate the process belongs to the caller's tenant
    const processResult = await query(`
      SELECT template_id FROM onboarding_processes WHERE id = $1 AND tenant_id = $2
    `, [process_id, tenantContext.tenant_id])

    if (processResult.rows.length === 0) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    const process = processResult.rows[0]

    // Validate the step belongs to the caller's tenant before recording completion
    const stepResult = await query(`
      SELECT 1 FROM onboarding_steps WHERE id = $1 AND tenant_id = $2
    `, [step_id, tenantContext.tenant_id])

    if (stepResult.rows.length === 0) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 })
    }

    // Insert step completion (tenant_id stamped for RLS / isolation)
    const completionResult = await query(`
      INSERT INTO step_completions (tenant_id, process_id, step_id, completed_by, feedback)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [tenantContext.tenant_id, process_id, step_id, completed_by, feedback])

    const completion = completionResult.rows[0]

    // Get total steps count
    const totalStepsResult = await query(`
      SELECT COUNT(*) as count FROM onboarding_steps WHERE template_id = $1 AND tenant_id = $2
    `, [process.template_id, tenantContext.tenant_id])

    const totalSteps = parseInt(totalStepsResult.rows[0].count)

    // Get completed steps count (scoped to tenant via onboarding_steps)
    const completedStepsResult = await query(`
      SELECT COUNT(*) as count
      FROM step_completions sc
      JOIN onboarding_steps os ON sc.step_id = os.id
      WHERE sc.process_id = $1 AND os.tenant_id = $2
    `, [process_id, tenantContext.tenant_id])

    const completedSteps = parseInt(completedStepsResult.rows[0].count)

    // Calculate progress
    const progress = totalSteps ? (completedSteps / totalSteps) * 100 : 0
    const status = progress === 100 ? "completed" : progress > 0 ? "in-progress" : "not-started"

    // Update process progress
    await query(`
      UPDATE onboarding_processes
      SET 
        progress = $1,
        status = $2,
        actual_completion_date = $3,
        updated_at = $4
      WHERE id = $5 AND tenant_id = $6
    `, [
      progress,
      status,
      progress === 100 ? new Date().toISOString().split("T")[0] : null,
      new Date().toISOString(),
      process_id,
      tenantContext.tenant_id
    ])

    return NextResponse.json({ completion, progress, status })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
