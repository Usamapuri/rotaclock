import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for profile updates
const updateProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  hourly_rate: z.number().positive('Hourly rate must be positive').optional(),
  max_hours_per_week: z.number().positive('Max hours must be positive').optional(),
  // Add more fields as needed for profile management
})

/**
 * GET /api/employees/[id]/profile
 * Get employee profile data
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

    // Check if user is accessing their own profile or is admin
    if (user?.role !== 'admin' && user?.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden: Can only access own profile' }, { status: 403 })
    }

    // Get employee profile
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_id,
        first_name,
        last_name,
        email,
        department,
        position,
        hire_date,
        hourly_rate,
        max_hours_per_week,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching employee profile:', error)
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ employee })

  } catch (error) {
    console.error('Error in GET /api/employees/[id]/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/employees/[id]/profile
 * Update employee profile data
 */
export async function PUT(
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

    // Check if user is updating their own profile or is admin
    if (user?.role !== 'admin' && user?.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden: Can only update own profile' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = updateProfileSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const updateData = validationResult.data

    // Check if employee exists
    const { data: existingEmployee, error: fetchError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Update employee profile
    const { data: employee, error: updateError } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        id,
        employee_id,
        first_name,
        last_name,
        email,
        department,
        position,
        hire_date,
        hourly_rate,
        max_hours_per_week,
        is_active,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Error updating employee profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      employee,
      message: 'Profile updated successfully' 
    })

  } catch (error) {
    console.error('Error in PUT /api/employees/[id]/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 