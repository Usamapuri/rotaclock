import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, buildSignupPendingEmail } from '@/lib/email'
import { query } from '@/lib/database'
import type { OrganizationSignupPayload } from '@/lib/provision-tenant-from-signup'

export async function POST(request: NextRequest) {
  try {
    const body: OrganizationSignupPayload = await request.json()
    const requiredFields = [
      'organizationName',
      'organizationEmail',
      'organizationPhone',
      'organizationIndustry',
      'organizationSize',
      'adminFirstName',
      'adminLastName',
      'adminEmail',
      'adminPhone',
      'adminPassword',
      'selectedPlan',
    ]
    for (const field of requiredFields) {
      if (!body[field as keyof OrganizationSignupPayload]) {
        return NextResponse.json({ success: false, error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.organizationEmail) || !emailRegex.test(body.adminEmail)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 })
    }
    if (body.adminPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters long' }, { status: 400 })
    }

    const existingOrg = await query('SELECT id FROM organizations WHERE LOWER(email) = LOWER($1)', [
      body.organizationEmail,
    ])
    if (existingOrg.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Organization with this email already exists' }, { status: 409 })
    }

    const existingAdmin = await query(
      'SELECT id FROM employees WHERE LOWER(email) = LOWER($1)',
      [body.adminEmail]
    )
    if (existingAdmin.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Admin user with this email already exists' }, { status: 409 })
    }

    const pending = await query(
      `SELECT id FROM tenant_signup_requests 
       WHERE status = 'pending' 
       AND (LOWER(payload->>'organizationEmail') = LOWER($1) OR LOWER(payload->>'adminEmail') = LOWER($2))`,
      [body.organizationEmail, body.adminEmail]
    )
    if (pending.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'An application with this organization or admin email is already pending review' },
        { status: 409 }
      )
    }

    const insert = await query(
      `INSERT INTO tenant_signup_requests (payload) VALUES ($1::jsonb) RETURNING id, created_at`,
      [JSON.stringify(body)]
    )

    const row = insert.rows[0]

    try {
      const pendingMail = buildSignupPendingEmail({
        orgName: body.organizationName,
        adminEmail: body.adminEmail,
      })
      await sendEmail({ to: body.organizationEmail, subject: pendingMail.subject, html: pendingMail.html })
      await sendEmail({ to: body.adminEmail, subject: pendingMail.subject, html: pendingMail.html })
    } catch (e) {
      console.warn('Signup acknowledgment email failed', e)
    }

    return NextResponse.json({
      success: true,
      message: 'Application received. You will be notified when approved.',
      data: {
        request_id: row.id,
        created_at: row.created_at,
      },
    })
  } catch (error) {
    console.error('Organization signup error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    if (message.includes('tenant_signup_requests')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Registration queue is not available. Run database migration scripts/migrations/001_super_admin_platform.sql',
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
