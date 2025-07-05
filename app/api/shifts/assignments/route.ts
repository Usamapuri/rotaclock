import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for shift assignments
const createShiftAssignmentSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  shift_id: z.string().uuid('Invalid shift ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  notes: z.string().optional(),
  status: z.enum(['assigned', 'confirmed', 'completed', 'cancelled', 'swap-requested']).default('assigned')
})

/**
 * GET /api/shifts/assignments
 * Fetch shift assignments with optional filters
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
    const employee_id = searchParams.get('employee_id')
    const shift_id = searchParams.get('shift_id')
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('shift_assignments')
      .select(`
        *,
        employee:employees(id, first_name, last_name, email, employee_id),
        shift:shifts(id, name, description, start_time, end_time, department, hourly_rate, color),
        assigned_by_employee:employees!shift_assignments_assigned_by_fkey(id, first_name, last_name, email)
      `, { count: 'exact' })

    // Apply filters
    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }
    if (shift_id) {
      query = query.eq('shift_id', shift_id)
    }
    if (date) {
      query = query.eq('date', date)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (start_date) {
      query = query.gte('date', start_date)
    }
    if (end_date) {
      query = query.lte('date', end_date)
    }

    // Apply pagination and ordering
    const { data: assignments, error, count } = await query
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching shift assignments:', error)
      return NextResponse.json({ error: 'Failed to fetch shift assignments' }, { status: 500 })
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      assignments: assignments || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })

  } catch (error) {
    console.error('Error in GET /api/shifts/assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/shifts/assignments
 * Create a new shift assignment
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
    const validationResult = createShiftAssignmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const assignmentData = validationResult.data

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_id')
      .eq('id', assignmentData.employee_id)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check if shift template exists
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('id, name, start_time, end_time')
      .eq('id', assignmentData.shift_id)
      .single()

    if (shiftError || !shift) {
      return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
    }

    // Check for overlapping assignments for the same employee on the same date
    const { data: overlappingAssignments, error: overlapError } = await supabase
      .from('shift_assignments')
      .select('id')
      .eq('employee_id', assignmentData.employee_id)
      .eq('date', assignmentData.date)
      .neq('status', 'cancelled')

    if (overlapError) {
      console.error('Error checking overlapping assignments:', overlapError)
      return NextResponse.json({ error: 'Failed to check assignment conflicts' }, { status: 500 })
    }

    if (overlappingAssignments && overlappingAssignments.length > 0) {
      return NextResponse.json({ 
        error: 'Employee already has a shift assignment on this date' 
      }, { status: 400 })
    }

    // Create shift assignment
    const { data: assignment, error: insertError } = await supabase
      .from('shift_assignments')
      .insert({
        employee_id: assignmentData.employee_id,
        shift_id: assignmentData.shift_id,
        date: assignmentData.date,
        start_time: assignmentData.start_time || shift.start_time,
        end_time: assignmentData.end_time || shift.end_time,
        status: assignmentData.status,
        notes: assignmentData.notes,
        assigned_by: user?.id // This will be null for demo auth, but that's okay
      })
      .select(`
        *,
        employee:employees(id, first_name, last_name, email, employee_id),
        shift:shifts(id, name, description, start_time, end_time, department, hourly_rate, color),
        assigned_by_employee:employees!shift_assignments_assigned_by_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error creating shift assignment:', insertError)
      return NextResponse.json({ error: 'Failed to create shift assignment' }, { status: 500 })
    }

    return NextResponse.json({ 
      assignment,
      message: 'Shift assignment created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/shifts/assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 