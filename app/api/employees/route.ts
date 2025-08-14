import { NextRequest, NextResponse } from 'next/server'
import { query, getEmployees, createEmployee, updateEmployee, deleteEmployee } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schemas
const createEmployeeSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  department: z.string().optional(),
  position: z.string().optional(),
  hire_date: z.string().optional(),
  manager_id: z.string().uuid().optional(),
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
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const is_active = searchParams.get('is_active')
    const position = searchParams.get('position')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build filters
    const filters: any = {}
    if (department) filters.department = department
    if (is_active !== null) filters.is_active = is_active === 'true'
    if (position) filters.position = position

    // Get employees
    const employees = await getEmployees(filters)

    // Apply pagination
    const total = employees.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedEmployees = employees.slice(startIndex, endIndex)

    return NextResponse.json({
      data: paginatedEmployees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/employees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/employees
 * Create a new employee
 */
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/employees - Request received')
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      console.log('Authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For demo purposes, allow admin access
    if (user.role !== 'admin') {
      console.log('User is not admin:', user.role)
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    console.log('Request body:', body)
    
    const validatedData = createEmployeeSchema.parse(body)
    console.log('Validated data:', validatedData)

    // Check if employee_id already exists
    const existingEmployeeResult = await query(
      'SELECT id FROM employees WHERE employee_id = $1',
      [validatedData.employee_id]
    )

    if (existingEmployeeResult.rows.length > 0) {
      return NextResponse.json({ error: 'Employee ID already exists' }, { status: 409 })
    }

    // Check if email already exists
    const existingEmailResult = await query(
      'SELECT id FROM employees WHERE email = $1',
      [validatedData.email]
    )

    if (existingEmailResult.rows.length > 0) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }

    // Create employee
    const employee = await createEmployee(validatedData)

    return NextResponse.json({ 
      data: employee,
      message: 'Employee created successfully' 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/employees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    if (user.role !== 'admin') {
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
    const employee = await updateEmployee(id, validatedData)

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
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    // Delete employee
    await deleteEmployee(id)

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