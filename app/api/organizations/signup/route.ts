import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

interface OrganizationSignupData {
  // Organization details
  organizationName: string
  organizationEmail: string
  organizationPhone: string
  organizationAddress?: string
  organizationCity?: string
  organizationState?: string
  organizationCountry: string
  organizationIndustry: string
  organizationSize: string
  
  // Admin details
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPhone: string
  adminPassword: string
  
  // Plan selection
  selectedPlan: string
}

export async function POST(request: NextRequest) {
  try {
    const body: OrganizationSignupData = await request.json()
    
    // Validate required fields
    const requiredFields = [
      'organizationName', 'organizationEmail', 'organizationPhone', 'organizationIndustry', 'organizationSize',
      'adminFirstName', 'adminLastName', 'adminEmail', 'adminPhone', 'adminPassword', 'selectedPlan'
    ]
    
    for (const field of requiredFields) {
      if (!body[field as keyof OrganizationSignupData]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.organizationEmail) || !emailRegex.test(body.adminEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (body.adminPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check if organization email already exists
    const existingOrg = await pool.query(
      'SELECT id FROM organizations WHERE email = $1',
      [body.organizationEmail]
    )
    
    if (existingOrg.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Organization with this email already exists' },
        { status: 409 }
      )
    }

    // Check if admin email already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM employees_new WHERE email = $1',
      [body.adminEmail]
    )
    
    if (existingAdmin.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Admin user with this email already exists' },
        { status: 409 }
      )
    }

    // Generate unique tenant ID
    const tenantId = generateTenantId(body.organizationName)
    
    // Generate organization slug
    const slug = generateSlug(body.organizationName)

    // Start transaction
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // 1. Create organization
      const organizationResult = await client.query(`
        INSERT INTO organizations (
          tenant_id,
          name,
          slug,
          email,
          phone,
          address,
          city,
          state,
          country,
          industry,
          company_size,
          subscription_status,
          subscription_plan,
          trial_start_date,
          trial_end_date,
          is_verified,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, tenant_id
      `, [
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
        'trial',
        body.selectedPlan,
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        false, // Will be verified via email
        true
      ])

      const organization = organizationResult.rows[0]

      // 2. Hash admin password
      const hashedPassword = await bcrypt.hash(body.adminPassword, 12)

      // 3. Create admin user
      const adminResult = await client.query(`
        INSERT INTO employees_new (
          id,
          employee_code,
          first_name,
          last_name,
          email,
          phone,
          password_hash,
          role,
          is_active,
          tenant_id,
          organization_id,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, employee_code, first_name, last_name, email, role
      `, [
        uuidv4(),
        generateEmployeeCode(body.adminFirstName, body.adminLastName),
        body.adminFirstName,
        body.adminLastName,
        body.adminEmail,
        body.adminPhone,
        hashedPassword,
        'admin',
        true,
        tenantId,
        organization.id,
        new Date(),
        new Date()
      ])

      const admin = adminResult.rows[0]

      // 4. Create organization admin relationship
      await client.query(`
        INSERT INTO organization_admins (
          organization_id,
          user_id,
          role,
          permissions
        ) VALUES ($1, $2, $3, $4)
      `, [
        organization.id,
        admin.id,
        'owner',
        JSON.stringify({
          manage_employees: true,
          manage_shifts: true,
          view_reports: true,
          manage_billing: true,
          manage_settings: true
        })
      ])

      // 5. Create default payroll period for the organization
      const currentDate = new Date()
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      await client.query(`
        INSERT INTO payroll_periods (
          period_name,
          start_date,
          end_date,
          status,
          tenant_id,
          organization_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`,
        startOfMonth,
        endOfMonth,
        'active',
        tenantId,
        organization.id
      ])

      await client.query('COMMIT')

      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Organization created successfully',
        data: {
          organization: {
            id: organization.id,
            tenant_id: organization.tenant_id,
            name: body.organizationName,
            slug: slug,
            email: body.organizationEmail,
            subscription_status: 'trial',
            subscription_plan: body.selectedPlan
          },
          admin: {
            id: admin.id,
            employee_code: admin.employee_code,
            first_name: admin.first_name,
            last_name: admin.last_name,
            email: admin.email,
            role: admin.role
          }
        }
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Organization signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function generateTenantId(organizationName: string): string {
  // Create a URL-friendly tenant ID from organization name
  const base = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20)
  
  // Add timestamp to ensure uniqueness
  const timestamp = Date.now().toString(36)
  
  return `${base}-${timestamp}`
}

function generateSlug(organizationName: string): string {
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
