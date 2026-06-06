import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isSuperAdmin, withRlsTenant } from '@/lib/api-auth'
import { insertPlatformAuditLog } from '@/lib/platform-audit'

const authMiddleware = createApiAuthMiddleware()

const patchSchema = z.object({
  is_active: z.boolean().optional(),
  max_employees: z.number().int().min(1).max(100000).optional(),
  subscription_status: z.enum(['trial', 'active', 'pending', 'cancelled', 'suspended']).optional(),
  trial_end_date: z.string().optional(),
})

async function _PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { tenantId } = await params
    const raw = await request.json()
    const body = patchSchema.safeParse(raw)
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid body', details: body.error.flatten() }, { status: 400 })
    }

    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (body.data.is_active !== undefined) {
      updates.push(`is_active = $${idx++}`)
      values.push(body.data.is_active)
    }
    if (body.data.max_employees !== undefined) {
      updates.push(`max_employees = $${idx++}`)
      values.push(body.data.max_employees)
    }
    if (body.data.subscription_status !== undefined) {
      updates.push(`subscription_status = $${idx++}`)
      values.push(body.data.subscription_status)
    }
    if (body.data.trial_end_date !== undefined) {
      updates.push(`trial_end_date = $${idx++}::timestamptz`)
      values.push(body.data.trial_end_date)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push('updated_at = NOW()')
    values.push(tenantId)

    const sql = `
      UPDATE organizations SET ${updates.join(', ')}
      WHERE tenant_id = $${idx}
      RETURNING id, tenant_id, name, email, is_active, max_employees, subscription_status, trial_end_date
    `

    const result = await query(sql, values)
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const row = result.rows[0]
    await insertPlatformAuditLog({
      superAdminId: user.id,
      action: 'tenant_updated',
      subjectTenantId: row.tenant_id,
      details: {
        admin_email: user.email,
        patch: body.data,
      },
    })

    return NextResponse.json({ success: true, data: row })
  } catch (e) {
    console.error('PATCH super-admin tenant', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const PATCH = withRlsTenant(_PATCH)
