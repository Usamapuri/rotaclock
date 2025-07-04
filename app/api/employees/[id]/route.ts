import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for updates
const updateEmployeeSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required').optional(),
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  hire_date: z.string().optional(),
  manager_id: z.string().uuid().optional(),
  hourly_rate: z.number().positive().optional(),
  max_hours_per_week: z.number().positive().optional(),
  is_active: z.boolean().optional()
})

/**
 * GET /api/employees/[id]
 * Get a specific employee by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Get employee with related data
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        *,
        manager:employees!manager_id(*),
        direct_reports:employees!manager_id(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      }
      console.error('Error fetching employee:', error)
      return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 })
    }

    // For demo purposes, allow admin access to all employee data
    const isAdmin = user.role === 'admin'
    const isOwnData = false // Simplified for demo

    if (!isAdmin && !isOwnData) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 })
    }

    return NextResponse.json({ data: employee })

  } catch (error) {
    console.error('Error in GET /api/employees/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/employees/[id]
 * Update a specific employee
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // For demo purposes, allow admin access
    const isAdmin = user.role === 'admin'
    const isOwnData = false // Simplified for demo

    if (!isAdmin && !isOwnData) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateEmployeeSchema.parse(body)

    // Check if employee exists
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check for unique constraints if updating employee_id or email
    if (validatedData.employee_id) {
      const { data: duplicateEmployeeId } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_id', validatedData.employee_id)
        .neq('id', id)
        .single()

      if (duplicateEmployeeId) {
        return NextResponse.json({ error: 'Employee ID already exists' }, { status: 409 })
      }
    }

    if (validatedData.email) {
      const { data: duplicateEmail } = await supabase
        .from('employees')
        .select('id')
        .eq('email', validatedData.email)
        .neq('id', id)
        .single()

      if (duplicateEmail) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
      }
    }

    // Update employee
    const { data: employee, error } = await supabase
      .from('employees')
      .update(validatedData)
      .eq('id', id)
      .select(`
        *,
        manager:employees!manager_id(*)
      `)
      .single()

    if (error) {
      console.error('Error updating employee:', error)
      return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
    }

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

    console.error('Error in PATCH /api/employees/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/employees/[id]
 * Delete a specific employee (soft delete by setting is_active to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // For demo purposes, allow admin access
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Check if employee exists
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id, is_active')
      .eq('id', id)
      .single()

    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (!existingEmployee.is_active) {
      return NextResponse.json({ error: 'Employee is already inactive' }, { status: 400 })
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('employees')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deactivating employee:', error)
      return NextResponse.json({ error: 'Failed to deactivate employee' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Employee deactivated successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/employees/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 