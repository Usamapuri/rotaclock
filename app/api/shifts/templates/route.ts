import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for shift templates
const createShiftTemplateSchema = z.object({
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
 * GET /api/shifts/templates
 * Fetch shift templates with optional filters
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
    const department = searchParams.get('department')
    const is_active = searchParams.get('is_active')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('shifts')
      .select('*', { count: 'exact' })

    // Apply filters
    if (department) {
      query = query.eq('department', department)
    }
    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }

    // Apply pagination and ordering
    const { data: shifts, error, count } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching shift templates:', error)
      return NextResponse.json({ error: 'Failed to fetch shift templates' }, { status: 500 })
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
    console.error('Error in GET /api/shifts/templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/shifts/templates
 * Create a new shift template
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
    const validationResult = createShiftTemplateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const shiftData = validationResult.data

    // Validate time logic
    const startTime = shiftData.start_time
    const endTime = shiftData.end_time
    
    if (startTime >= endTime) {
      return NextResponse.json({ 
        error: 'End time must be after start time' 
      }, { status: 400 })
    }

    // Create shift template
    const { data: shift, error: insertError } = await supabase
      .from('shifts')
      .insert({
        name: shiftData.name,
        description: shiftData.description,
        start_time: shiftData.start_time,
        end_time: shiftData.end_time,
        department: shiftData.department,
        required_staff: shiftData.required_staff,
        hourly_rate: shiftData.hourly_rate,
        color: shiftData.color || '#3B82F6',
        is_active: shiftData.is_active,
        created_by: user?.id // This will be null for demo auth, but that's okay
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating shift template:', insertError)
      return NextResponse.json({ error: 'Failed to create shift template' }, { status: 500 })
    }

    return NextResponse.json({ 
      shift,
      message: 'Shift template created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/shifts/templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 