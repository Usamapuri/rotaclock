import type { PoolClient } from 'pg'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export interface OrganizationSignupPayload {
  organizationName: string
  organizationEmail: string
  organizationPhone: string
  organizationAddress?: string
  organizationCity?: string
  organizationState?: string
  organizationCountry: string
  organizationIndustry: string
  organizationSize: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPhone: string
  adminPassword: string
  selectedPlan: string
}

export function generateTenantId(organizationName: string): string {
  const base = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20)
  const timestamp = Date.now().toString(36)
  return `${base}-${timestamp}`
}

export function generateSlug(organizationName: string): string {
  return organizationName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 50)
}

function generateEmployeeCode(firstName: string, lastName: string): string {
  const prefix = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
  const timestamp = Date.now().toString().slice(-6)
  return `${prefix}${timestamp}`
}

export type ProvisionTenantResult = {
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
}

/**
 * Creates organization, admin employee, default location, org admin link, payroll period.
 * Caller must run inside a transaction and validate payload + uniqueness first.
 */
export async function provisionTenantFromSignup(
  client: PoolClient,
  body: OrganizationSignupPayload
): Promise<ProvisionTenantResult> {
  const tenantId = generateTenantId(body.organizationName)
  const slug = generateSlug(body.organizationName)

  // Under DB-enforced RLS, set this connection's tenant to the new tenant so the
  // INSERTs below pass each policy's WITH CHECK (tenant_id = current_tenant()).
  // SET LOCAL is scoped to the caller's transaction. No-op when RLS is inert.
  await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId])

  const organizationResult = await client.query(
    `
        INSERT INTO organizations (
          tenant_id,name,slug,email,phone,address,city,state,country,industry,company_size,subscription_status,subscription_plan,trial_start_date,trial_end_date,is_verified,is_active
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'trial',$12,NOW(), NOW() + INTERVAL '30 days', false, true)
        RETURNING id, tenant_id
      `,
    [
      tenantId,
      body.organizationName,
      slug,
      body.organizationEmail,
      body.organizationPhone,
      body.organizationAddress || null,
      body.organizationCity || null,
      body.organizationState || null,
      body.organizationCountry,
      body.organizationIndustry,
      body.organizationSize,
      body.selectedPlan,
    ]
  )

  const organization = organizationResult.rows[0]
  const hashedPassword = await bcrypt.hash(body.adminPassword, 12)

  const adminResult = await client.query(
    `
        INSERT INTO employees (
          id, employee_code, first_name, last_name, email, phone, password_hash, role, is_active, tenant_id, organization_id, department, job_position, hire_date, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'admin', true, $8, $9, $10, $11, CURRENT_DATE, NOW(), NOW())
        RETURNING id, employee_code, first_name, last_name, email, role
      `,
    [
      uuidv4(),
      generateEmployeeCode(body.adminFirstName, body.adminLastName),
      body.adminFirstName,
      body.adminLastName,
      body.adminEmail,
      body.adminPhone,
      hashedPassword,
      tenantId,
      organization.id,
      'Administration',
      'Owner',
    ]
  )

  const admin = adminResult.rows[0]

  const defaultLocationResult = await client.query(
    `
        INSERT INTO locations (tenant_id, organization_id, name, description, is_active, created_by)
        VALUES ($1, $2, $3, $4, true, $5)
        RETURNING id, name
      `,
    [
      tenantId,
      organization.id,
      body.organizationName ? `${body.organizationName} Headquarters` : 'Main Office',
      'Default location created during organization setup',
      admin.id,
    ]
  )

  const defaultLocation = defaultLocationResult.rows[0]

  await client.query(
    `
        UPDATE employees 
        SET location_id = $1, updated_at = NOW()
        WHERE id = $2
      `,
    [defaultLocation.id, admin.id]
  )

  await client.query(
    `
        INSERT INTO organization_admins (organization_id, user_id, role, permissions)
        VALUES ($1, $2, 'owner', $3)
      `,
    [
      organization.id,
      admin.id,
      JSON.stringify({
        manage_employees: true,
        manage_shifts: true,
        view_reports: true,
        manage_billing: true,
        manage_settings: true,
      }),
    ]
  )

  const currentDate = new Date()
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  await client.query(
    `
        INSERT INTO payroll_periods (name, start_date, end_date, status, tenant_id, organization_id)
        VALUES ($1, $2, $3, 'active', $4, $5)
      `,
    [
      `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`,
      startOfMonth,
      endOfMonth,
      tenantId,
      organization.id,
    ]
  )

  return { organization, admin, tenantId, slug }
}
