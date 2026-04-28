import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { transaction } from '@/lib/database'
import { createApiAuthMiddleware, isSuperAdmin } from '@/lib/api-auth'
import { provisionTenantFromSignup, type OrganizationSignupPayload } from '@/lib/provision-tenant-from-signup'
import { sendEmail, buildOrgVerificationEmail, buildWelcomeEmail } from '@/lib/email'
import { insertPlatformAuditLog } from '@/lib/platform-audit'

const authMiddleware = createApiAuthMiddleware()

const signupPayloadSchema = z.object({
  organizationName: z.string().min(1),
  organizationEmail: z.string().email(),
  organizationPhone: z.string().min(1),
  organizationAddress: z.string().optional(),
  organizationCity: z.string().optional(),
  organizationState: z.string().optional(),
  organizationCountry: z.string().min(1),
  organizationIndustry: z.string().min(1),
  organizationSize: z.string().min(1),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPhone: z.string().min(1),
  adminPassword: z.string().min(8),
  selectedPlan: z.string().min(1),
})

function parsePayload(raw: unknown): OrganizationSignupPayload {
  return signupPayloadSchema.parse(raw) as OrganizationSignupPayload
}

type ApproveOk = {
  organization: { id: string; tenant_id: string }
  admin: {
    id: string
    employee_code: string
    first_name: string
    last_name: string
    email: string
    role: string
  }
  tenantId: string
  slug: string
  payload: OrganizationSignupPayload
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: requestId } = await params

    try {
      const approveResult = await transaction(async (client) => {
        const lock = await client.query(
          `SELECT * FROM tenant_signup_requests WHERE id = $1 FOR UPDATE`,
          [requestId]
        )
        if (lock.rows.length === 0) {
          const e = new Error('NOT_FOUND') as Error & { code: string }
          e.code = 'NOT_FOUND'
          throw e
        }
        const row = lock.rows[0]
        if (row.status !== 'pending') {
          const e = new Error('NOT_PENDING') as Error & { code: string }
          e.code = 'NOT_PENDING'
          throw e
        }

        let payload: OrganizationSignupPayload
        try {
          payload = parsePayload(row.payload)
        } catch {
          const e = new Error('BAD_PAYLOAD') as Error & { code: string }
          e.code = 'BAD_PAYLOAD'
          throw e
        }

        const dupOrg = await client.query(`SELECT id FROM organizations WHERE LOWER(email) = LOWER($1)`, [
          payload.organizationEmail,
        ])
        if (dupOrg.rows.length > 0) {
          const e = new Error('DUP_ORG') as Error & { code: string }
          e.code = 'DUP_ORG'
          throw e
        }

        const dupAdmin = await client.query(`SELECT id FROM employees WHERE LOWER(email) = LOWER($1)`, [
          payload.adminEmail,
        ])
        if (dupAdmin.rows.length > 0) {
          const e = new Error('DUP_ADMIN') as Error & { code: string }
          e.code = 'DUP_ADMIN'
          throw e
        }

        const { organization, admin, tenantId, slug } = await provisionTenantFromSignup(client, payload)

        await client.query(
          `UPDATE tenant_signup_requests SET
          status = 'approved',
          reviewed_by_super_admin_id = $1,
          reviewed_at = NOW(),
          created_organization_id = $2,
          created_admin_employee_id = $3,
          updated_at = NOW()
        WHERE id = $4`,
          [user.id, organization.id, admin.id, requestId]
        )

        const ok: ApproveOk = { organization, admin, tenantId, slug, payload }
        return ok
      })

      await insertPlatformAuditLog({
        superAdminId: user.id,
        action: 'request_approved',
        subjectTenantId: approveResult.tenantId,
        subjectUserId: approveResult.admin.id,
        details: {
          request_id: requestId,
          admin_email: user.email,
          org_email: approveResult.payload.organizationEmail,
        },
      })

      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.rotaclock.com'
        const verifyUrl = `${base}/api/organizations/verify?tenant_id=${encodeURIComponent(approveResult.tenantId)}`
        const v = buildOrgVerificationEmail({
          orgName: approveResult.payload.organizationName,
          verifyUrl,
        })
        await sendEmail({ to: approveResult.payload.organizationEmail, subject: v.subject, html: v.html })

        const w = buildWelcomeEmail({
          orgName: approveResult.payload.organizationName,
          email: approveResult.payload.adminEmail,
          loginUrl: `${base}/login`,
        })
        await sendEmail({ to: approveResult.payload.adminEmail, subject: w.subject, html: w.html })
      } catch (e) {
        console.warn('Post-approval email failed', e)
      }

      return NextResponse.json({
        success: true,
        message: 'Organization provisioned',
        data: {
          organization: {
            id: approveResult.organization.id,
            tenant_id: approveResult.tenantId,
            name: approveResult.payload.organizationName,
            slug: approveResult.slug,
            email: approveResult.payload.organizationEmail,
          },
          admin: approveResult.admin,
        },
      })
    } catch (err) {
      const code = err instanceof Error && 'code' in err ? (err as Error & { code: string }).code : ''
      if (code === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }
      if (code === 'NOT_PENDING') {
        return NextResponse.json({ error: 'Request is not pending' }, { status: 409 })
      }
      if (code === 'BAD_PAYLOAD') {
        return NextResponse.json({ error: 'Invalid stored payload' }, { status: 400 })
      }
      if (code === 'DUP_ORG') {
        return NextResponse.json({ error: 'Organization with this email already exists' }, { status: 409 })
      }
      if (code === 'DUP_ADMIN') {
        return NextResponse.json({ error: 'Admin user with this email already exists' }, { status: 409 })
      }
      throw err
    }
  } catch (e) {
    console.error('POST approve request', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
