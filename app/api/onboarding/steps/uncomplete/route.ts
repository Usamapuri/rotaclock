import { type NextRequest, NextResponse } from "next/server"
import { createApiAuthMiddleware, withRlsTenant } from '@/lib/api-auth'
import { query } from "@/lib/database"
import { getTenantContext } from "@/lib/tenant"

async function _POST(request: NextRequest) {
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

    const { process_id, step_id } = body

    // Validate the process belongs to the caller's tenant
    const processResult = await query(`
      SELECT template_id FROM onboarding_processes WHERE id = $1 AND tenant_id = $2
    `, [process_id, tenantContext.tenant_id])

    if (processResult.rows.length === 0) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    const process = processResult.rows[0]

    // Validate the step belongs to the caller's tenant before deleting completion
    const stepResult = await query(`
      SELECT 1 FROM onboarding_steps WHERE id = $1 AND tenant_id = $2
    `, [step_id, tenantContext.tenant_id])

    if (stepResult.rows.length === 0) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 })
    }

    // Delete step completion (step ownership already validated above)
    await query(`
      DELETE FROM step_completions
      WHERE process_id = $1 AND step_id = $2
    `, [process_id, step_id])

    // Recalculate progress (same logic as complete endpoint)
    const totalStepsResult = await query(`
      SELECT COUNT(*) as count FROM onboarding_steps WHERE template_id = $1 AND tenant_id = $2
    `, [process.template_id, tenantContext.tenant_id])

    const totalSteps = parseInt(totalStepsResult.rows[0].count)

    const completedStepsResult = await query(`
      SELECT COUNT(*) as count
      FROM step_completions sc
      JOIN onboarding_steps os ON sc.step_id = os.id
      WHERE sc.process_id = $1 AND os.tenant_id = $2
    `, [process_id, tenantContext.tenant_id])

    const completedSteps = parseInt(completedStepsResult.rows[0].count)

    const progress = totalSteps ? (completedSteps / totalSteps) * 100 : 0
    const status = progress === 100 ? "completed" : progress > 0 ? "in-progress" : "not-started"

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
      null,
      new Date().toISOString(),
      process_id,
      tenantContext.tenant_id
    ])

    return NextResponse.json({ progress, status })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const POST = withRlsTenant(_POST)
