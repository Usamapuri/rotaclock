import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for leave requests
const createLeaveRequestSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  leave_type: z.enum(['vacation', 'sick', 'personal', 'bereavement', 'other']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).default('pending')
})

const updateLeaveRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  admin_notes: z.string().optional()
})

/**
 * GET /api/employees/leave-requests
 * Get leave requests (filtered by user role and permissions)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const employeeId = searchParams.get('employee_id')
    const leaveType = searchParams.get('leave_type')

    let query = supabase
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        leave_type,
        start_date,
        end_date,
        reason,
        status,
        admin_notes,
        created_at,
        updated_at,
        employee:employees!leave_requests_employee_id_fkey(
          id,
          first_name,
          last_name,
          employee_id,
          department
        )
      `)

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Filter by leave type if provided
    if (leaveType) {
      query = query.eq('leave_type', leaveType)
    }

    // Filter by employee if not admin
    if (user?.role !== 'admin') {
      // Employees can only see their own leave requests
      query = query.eq('employee_id', user?.id)
    } else if (employeeId) {
      // Admin can filter by specific employee
      query = query.eq('employee_id', employeeId)
    }

    const { data: leaveRequests, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching leave requests:', error)
      return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 })
    }

    return NextResponse.json({ leaveRequests })

  } catch (error) {
    console.error('Error in GET /api/employees/leave-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/employees/leave-requests
 * Create a new leave request
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = createLeaveRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { employee_id, leave_type, start_date, end_date, reason, status } = validationResult.data

    // Check permissions - employees can only create requests for themselves
    if (user?.role !== 'admin' && user?.id !== employee_id) {
      return NextResponse.json({ error: 'You can only create leave requests for yourself' }, { status: 403 })
    }

    // Verify that the employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employee_id)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Validate date range
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (startDate < today) {
      return NextResponse.json({ error: 'Start date cannot be in the past' }, { status: 400 })
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 })
    }

    // Check for overlapping leave requests
    const { data: overlappingRequests, error: overlapError } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('employee_id', employee_id)
      .in('status', ['pending', 'approved'])
      .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`)
      .limit(1)

    if (overlapError) {
      console.error('Error checking overlapping requests:', overlapError)
    } else if (overlappingRequests && overlappingRequests.length > 0) {
      return NextResponse.json({ error: 'You have overlapping leave requests for this period' }, { status: 409 })
    }

    // Create the leave request
    const { data: leaveRequest, error: createError } = await supabase
      .from('leave_requests')
      .insert({
        employee_id,
        leave_type,
        start_date,
        end_date,
        reason,
        status
      })
      .select(`
        id,
        employee_id,
        leave_type,
        start_date,
        end_date,
        reason,
        status,
        admin_notes,
        created_at,
        updated_at
      `)
      .single()

    if (createError) {
      console.error('Error creating leave request:', createError)
      return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
    }

    return NextResponse.json({ 
      leaveRequest,
      message: 'Leave request created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/employees/leave-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 