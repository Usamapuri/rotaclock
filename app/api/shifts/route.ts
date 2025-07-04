import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schemas
const createShiftSchema = z.object({
  name: z.string().min(1, 'Shift name is required'),
  description: z.string().optional(),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  department: z.string().optional(),
  required_staff: z.number().positive('Required staff must be positive'),
  hourly_rate: z.number().positive('Hourly rate must be positive').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  is_active: z.boolean().default(true)
})

/**
 * GET /api/shifts
 * Fetch shifts with optional filters
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
    const status = searchParams.get('status')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('shifts')
      .select(`
        *,
        employee:employees(id, first_name, last_name, email)
      `, { count: 'exact' })

    // Apply filters
    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (start_date) {
      query = query.gte('start_time', start_date)
    }
    if (end_date) {
      query = query.lte('end_time', end_date)
    }

    // Apply pagination and ordering
    const { data: shifts, error, count } = await query
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching shifts:', error)
      return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      shifts: shifts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })

  } catch (error) {
    console.error('Error in GET /api/shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/shifts
 * Create a new shift
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
    const { employee_id, start_time, end_time, notes, location } = body

    // Validate required fields
    if (!employee_id || !start_time || !end_time) {
      return NextResponse.json({ 
        error: 'Missing required fields: employee_id, start_time, end_time' 
      }, { status: 400 })
    }

    // Validate dates
    const startDate = new Date(start_time)
    const endDate = new Date(end_time)
    
    if (startDate >= endDate) {
      return NextResponse.json({ 
        error: 'End time must be after start time' 
      }, { status: 400 })
    }

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employee_id)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check for overlapping shifts
    const { data: overlappingShifts, error: overlapError } = await supabase
      .from('shifts')
      .select('id')
      .eq('employee_id', employee_id)
      .neq('status', 'cancelled')
      .or(`start_time.lt.${end_time},end_time.gt.${start_time}`)

    if (overlapError) {
      console.error('Error checking overlapping shifts:', overlapError)
      return NextResponse.json({ error: 'Failed to check shift conflicts' }, { status: 500 })
    }

    if (overlappingShifts && overlappingShifts.length > 0) {
      return NextResponse.json({ 
        error: 'Shift conflicts with existing shifts for this employee' 
      }, { status: 400 })
    }

    // Create shift
    const { data: shift, error: insertError } = await supabase
      .from('shifts')
      .insert({
        employee_id,
        start_time,
        end_time,
        status: 'scheduled',
        notes,
        location
      })
      .select(`
        *,
        employee:employees(id, first_name, last_name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error creating shift:', insertError)
      return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
    }

    return NextResponse.json({ 
      shift,
      message: 'Shift created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 