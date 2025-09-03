import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// Validation schemas
const createEmployeeSchema = z.object({
  employee_code: z.string().min(1, 'Employee code is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  department: z.string().min(1, 'Department is required'),
  job_position: z.string().min(1, 'Job position is required'),
  role: z.enum(['admin', 'manager', 'lead', 'employee']).default('employee'),
  hire_date: z.string().optional(),
  manager_id: z.string().uuid().optional(),
  team_id: z.string().uuid().optional(),
  hourly_rate: z.number().positive().optional(),
  max_hours_per_week: z.number().positive().optional(),
  is_active: z.boolean().default(true),
  password: z.string().optional()
})

const updateEmployeeSchema = createEmployeeSchema.partial()

/**
 * GET /api/employees
 * List all employees with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication and tenant context
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant context
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json(
        { success: false, error: 'No tenant context found' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const is_active = searchParams.get('is_active')
    const job_position = searchParams.get('job_position')
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query with tenant filtering
    let queryText = `
      SELECT 
        e.id,
        e.employee_code as employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.job_position,
        e.role,
        e.hire_date,
        e.manager_id,
        e.team_id,
        e.hourly_rate,
        e.max_hours_per_week,
        e.is_active,
        e.is_online,
        e.last_online,
        t.name as team_name,
        m.first_name || ' ' || m.last_name as manager_name,
        COUNT(sa.id) as total_assignments,
        COUNT(te.id) as total_time_entries,
        COALESCE(SUM(te.total_hours), 0) as total_hours_worked
      FROM employees_new e
      LEFT JOIN teams_new t ON e.team_id = t.id AND t.tenant_id = e.tenant_id
      LEFT JOIN employees_new m ON e.manager_id = m.id AND m.tenant_id = e.tenant_id
      LEFT JOIN shift_assignments_new sa ON e.id = sa.employee_id AND sa.tenant_id = e.tenant_id
      LEFT JOIN time_entries_new te ON e.id = te.employee_id AND te.tenant_id = e.tenant_id
      WHERE e.tenant_id = $1
    `
    const params: any[] = [tenantContext.tenant_id]
    let paramIndex = 2

    if (department) {
      queryText += ` AND e.department = $${paramIndex++}`
      params.push(department)
    }
    if (is_active !== null) {
      queryText += ` AND e.is_active = $${paramIndex++}`
      params.push(is_active === 'true')
    }
    if (job_position) {
      queryText += ` AND e.job_position = $${paramIndex++}`
      params.push(job_position)
    }
    if (role) {
      queryText += ` AND e.role = $${paramIndex++}`
      params.push(role)
    }
    if (search) {
      queryText += ` AND (
        LOWER(e.first_name) LIKE LOWER($${paramIndex}) OR
        LOWER(e.last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(e.employee_code) LIKE LOWER($${paramIndex}) OR
        LOWER(e.email) LIKE LOWER($${paramIndex})
      )`
      params.push(`%${search}%`)
      paramIndex++
    }

    // Add grouping and ordering
    queryText += ` GROUP BY e.id, e.employee_code, e.first_name, e.last_name, e.email, e.department, e.job_position, e.role, e.hire_date, e.manager_id, e.team_id, e.hourly_rate, e.max_hours_per_week, e.is_active, e.is_online, e.last_online, t.name, m.first_name, m.last_name`
    queryText += ` ORDER BY e.first_name, e.last_name`

    // Get total count with tenant filtering
    const countQuery = queryText.replace(/SELECT.*FROM/, 'SELECT COUNT(DISTINCT e.id) as total FROM')
    const countResult = await query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    // Apply pagination
    queryText += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await query(queryText, params)
    const employees = result.rows

    return NextResponse.json({
      success: true,
      data: employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/employees:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/employees
 * Create a new employee
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication and tenant context
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant context
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json(
        { success: false, error: 'No tenant context found' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createEmployeeSchema.parse(body)

    // Add tenant_id to the employee data
    const employeeData = {
      ...validatedData,
      tenant_id: tenantContext.tenant_id,
      organization_id: tenantContext.organization_id
    }

    // Check if employee_code already exists
    const existingEmployeeResult = await query(
      'SELECT id FROM employees_new WHERE employee_code = $1',
      [validatedData.employee_code]
    )

    if (existingEmployeeResult.rows.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Employee code already exists' 
      }, { status: 409 })
    }

    // Check if email already exists
    const existingEmailResult = await query(
      'SELECT id FROM employees_new WHERE email = $1',
      [validatedData.email]
    )

    if (existingEmailResult.rows.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email already exists' 
      }, { status: 409 })
    }

    // Hash password if provided
    const passwordHash = validatedData.password ? bcrypt.hashSync(validatedData.password, 10) : null

    // Create employee
    const insertQuery = `
      INSERT INTO employees_new (
        employee_code, first_name, last_name, email, department, job_position,
        role, hire_date, manager_id, team_id, hourly_rate, max_hours_per_week, is_active, password_hash, tenant_id, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `

    const insertResult = await query(insertQuery, [
      validatedData.employee_code,
      validatedData.first_name,
      validatedData.last_name,
      validatedData.email,
      validatedData.department,
      validatedData.job_position,
      validatedData.role,
      validatedData.hire_date || new Date().toISOString().split('T')[0],
      validatedData.manager_id,
      validatedData.team_id,
      validatedData.hourly_rate,
      validatedData.max_hours_per_week,
      validatedData.is_active,
      passwordHash,
      tenantContext.tenant_id,
      tenantContext.organization_id
    ])

    const newEmployee = insertResult.rows[0]

    return NextResponse.json({
      success: true,
      data: newEmployee,
      message: 'Employee created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/employees:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/employees
 * Update an employee
 */
export async function PUT(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For demo purposes, allow admin access
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    // Validate update data
    const validatedData = updateEmployeeSchema.parse(updateData)

    // Update employee
    // Inline update implementation to avoid missing helper
    const fields = Object.keys(validatedData)
    const values = Object.values(validatedData)
    const setClauses = fields.map((field, idx) => `${field} = $${idx + 2}`).join(', ')
    const updateQuery = `
      UPDATE employees_new
      SET ${setClauses}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `
    const updateResult = await query(updateQuery, [id, ...values])
    const employee = updateResult.rows[0]

    return NextResponse.json({ 
      data: employee,
      message: 'Employee updated successfully' 
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'Employee not found') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    console.error('Error in PUT /api/employees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/employees
 * Delete an employee
 */
export async function DELETE(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For demo purposes, allow admin access
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    // Delete employee
    await query('DELETE FROM employees_new WHERE id = $1', [id])

    return NextResponse.json({ 
      message: 'Employee deleted successfully' 
    })

  } catch (error) {
    if (error instanceof Error && error.message === 'Employee not found') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    console.error('Error in DELETE /api/employees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 