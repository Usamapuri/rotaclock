import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
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
  is_active: z.boolean().default(true)
})

const updateEmployeeSchema = createEmployeeSchema.partial()

/**
 * GET /api/employees
 * List all employees with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const is_active = searchParams.get('is_active')
    const position = searchParams.get('position')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('employees')
      .select(`
        *,
        manager:employees!manager_id(*)
      `, { count: 'exact' })

    // Apply filters
    if (department) {
      query = query.eq('department', department)
    }
    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }
    if (position) {
      query = query.eq('position', position)
    }

    // Apply pagination
    query = query
      .order('first_name')
      .range(offset, offset + limit - 1)

    const { data: employees, error, count } = await query

    if (error) {
      console.error('Error fetching employees:', error)
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
    }

    return NextResponse.json({
      data: employees,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
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
    const supabase = createServerSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('position')
      .eq('user_id', user.id)
      .single()

    if (!currentEmployee?.position?.toLowerCase().includes('admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createEmployeeSchema.parse(body)

    // Check if employee_id already exists
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_id', validatedData.employee_id)
      .single()

    if (existingEmployee) {
      return NextResponse.json({ error: 'Employee ID already exists' }, { status: 409 })
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('employees')
      .select('id')
      .eq('email', validatedData.email)
      .single()

    if (existingEmail) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }

    // Create employee
    const { data: employee, error } = await supabase
      .from('employees')
      .insert(validatedData)
      .select(`
        *,
        manager:employees!manager_id(*)
      `)
      .single()

    if (error) {
      console.error('Error creating employee:', error)
      return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
    }

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