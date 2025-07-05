import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for swap requests
const createSwapRequestSchema = z.object({
  requester_shift_id: z.string().uuid('Invalid shift ID'),
  target_shift_id: z.string().uuid('Invalid shift ID'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).default('pending')
})

const updateSwapRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  admin_notes: z.string().optional()
})

/**
 * GET /api/shifts/swap-requests
 * Get swap requests (filtered by user role and permissions)
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

    let query = supabase
      .from('shift_swap_requests')
      .select(`
        id,
        requester_shift_id,
        target_shift_id,
        reason,
        status,
        admin_notes,
        created_at,
        updated_at,
        requester_shift:shifts!shift_swap_requests_requester_shift_id_fkey(
          id,
          employee_id,
          shift_template_id,
          start_time,
          end_time,
          status,
          employee:employees!shifts_employee_id_fkey(
            id,
            first_name,
            last_name,
            employee_id
          )
        ),
        target_shift:shifts!shift_swap_requests_target_shift_id_fkey(
          id,
          employee_id,
          shift_template_id,
          start_time,
          end_time,
          status,
          employee:employees!shifts_employee_id_fkey(
            id,
            first_name,
            last_name,
            employee_id
          )
        )
      `)

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Filter by employee if not admin
    if (user?.role !== 'admin') {
      // Employees can only see their own swap requests
      query = query.or(`requester_shift.employee_id.eq.${user?.id},target_shift.employee_id.eq.${user?.id}`)
    } else if (employeeId) {
      // Admin can filter by specific employee
      query = query.or(`requester_shift.employee_id.eq.${employeeId},target_shift.employee_id.eq.${employeeId}`)
    }

    const { data: swapRequests, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching swap requests:', error)
      return NextResponse.json({ error: 'Failed to fetch swap requests' }, { status: 500 })
    }

    return NextResponse.json({ swapRequests })

  } catch (error) {
    console.error('Error in GET /api/shifts/swap-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/shifts/swap-requests
 * Create a new swap request
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
    const validationResult = createSwapRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { requester_shift_id, target_shift_id, reason, status } = validationResult.data

    // Verify that the requester owns the requester shift
    const { data: requesterShift, error: requesterError } = await supabase
      .from('shifts')
      .select('id, employee_id')
      .eq('id', requester_shift_id)
      .single()

    if (requesterError || !requesterShift) {
      return NextResponse.json({ error: 'Requester shift not found' }, { status: 404 })
    }

    if (requesterShift.employee_id !== user?.id && user?.role !== 'admin') {
      return NextResponse.json({ error: 'You can only request swaps for your own shifts' }, { status: 403 })
    }

    // Verify that the target shift exists and is different
    const { data: targetShift, error: targetError } = await supabase
      .from('shifts')
      .select('id, employee_id')
      .eq('id', target_shift_id)
      .single()

    if (targetError || !targetShift) {
      return NextResponse.json({ error: 'Target shift not found' }, { status: 404 })
    }

    if (requester_shift_id === target_shift_id) {
      return NextResponse.json({ error: 'Cannot swap a shift with itself' }, { status: 400 })
    }

    // Check if there's already a pending swap request for these shifts
    const { data: existingRequest, error: existingError } = await supabase
      .from('shift_swap_requests')
      .select('id')
      .or(`and(requester_shift_id.eq.${requester_shift_id},target_shift_id.eq.${target_shift_id}),and(requester_shift_id.eq.${target_shift_id},target_shift_id.eq.${requester_shift_id})`)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return NextResponse.json({ error: 'A pending swap request already exists for these shifts' }, { status: 409 })
    }

    // Create the swap request
    const { data: swapRequest, error: createError } = await supabase
      .from('shift_swap_requests')
      .insert({
        requester_shift_id,
        target_shift_id,
        reason,
        status
      })
      .select(`
        id,
        requester_shift_id,
        target_shift_id,
        reason,
        status,
        admin_notes,
        created_at,
        updated_at
      `)
      .single()

    if (createError) {
      console.error('Error creating swap request:', createError)
      return NextResponse.json({ error: 'Failed to create swap request' }, { status: 500 })
    }

    return NextResponse.json({ 
      swapRequest,
      message: 'Swap request created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/shifts/swap-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 