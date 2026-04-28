import { query } from '@/lib/database'

export async function insertPlatformAuditLog(params: {
  superAdminId: string
  action: string
  subjectTenantId?: string | null
  subjectUserId?: string | null
  details?: Record<string, unknown>
}): Promise<void> {
  await query(
    `INSERT INTO platform_audit_logs (super_admin_id, action, subject_tenant_id, subject_user_id, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      params.superAdminId,
      params.action,
      params.subjectTenantId ?? null,
      params.subjectUserId ?? null,
      JSON.stringify(params.details ?? {}),
    ]
  )
}
