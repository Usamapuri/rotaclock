import { type NextRequest, NextResponse } from "next/server"
import { createApiAuthMiddleware, withRlsTenant } from '@/lib/api-auth'
import { query } from "@/lib/database"
import { getTenantContext } from "@/lib/tenant"

async function _GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const { id } = await params

    const processResult = await query(`
      SELECT * FROM onboarding_processes WHERE id = $1 AND tenant_id = $2
    `, [id, tenantContext.tenant_id])

    if (processResult.rows.length === 0) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    const process = processResult.rows[0]

    // Get step completions for this process
    const completionsResult = await query(`
      SELECT sc.step_id, sc.completed_at, sc.feedback, sc.completed_by
      FROM step_completions sc
      JOIN onboarding_steps os ON os.id = sc.step_id
      WHERE sc.process_id = $1 AND os.tenant_id = $2
    `, [id, tenantContext.tenant_id])

    const stepCompletions = completionsResult.rows

    // Get template steps
    const stepsResult = await query(`
      SELECT * FROM onboarding_steps
      WHERE template_id = $1 AND tenant_id = $2
      ORDER BY step_order
    `, [process.template_id, tenantContext.tenant_id])

    const steps = stepsResult.rows

    return NextResponse.json({ 
      process: { ...process, step_completions: stepCompletions }, 
      steps 
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function _PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()

    // Never allow tenant_id to be reassigned via the request body
    delete (body as Record<string, unknown>).tenant_id

    // Build update query dynamically
    const updateFields = Object.keys(body).map((key, index) => `${key} = $${index + 2}`).join(', ')
    const updateValues = Object.values(body)

    // tenant_id predicate is the last positional param ($1 = id, then body values, then tenant_id)
    const tenantParamIndex = updateValues.length + 2

    const processResult = await query(`
      UPDATE onboarding_processes
      SET ${updateFields}, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $${tenantParamIndex}
      RETURNING *
    `, [id, ...updateValues, tenantContext.tenant_id])

    if (processResult.rows.length === 0) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    const process = processResult.rows[0]

    return NextResponse.json({ data: process })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const GET = withRlsTenant(_GET)
export const PATCH = withRlsTenant(_PATCH)
