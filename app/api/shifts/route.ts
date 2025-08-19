import { NextRequest, NextResponse } from 'next/server'
import { query, getShifts, createShift, updateShift, deleteShift } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schemas
const createShiftSchema = z.object({
  name: z.string().min(1, 'Shift name is required'),
  description: z.string().optional(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  department: z.string().optional(),
  required_staff: z.number().positive('Required staff must be positive'),
  hourly_rate: z.number().positive().optional(),
  color: z.string().min(1, 'Color is required'),
  is_active: z.boolean().default(true),
  created_by: z.string().uuid().optional()
})

const updateShiftSchema = createShiftSchema.partial()

/**
 * GET /api/shifts
 * List all shifts with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const is_active = searchParams.get('is_active')

    // Build filters
    const filters: any = {}
    if (department) filters.department = department
    if (is_active !== null) filters.is_active = is_active === 'true'

    // Get shifts
    const shifts = await getShifts(filters)

    return NextResponse.json({
      data: shifts
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
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createShiftSchema.parse(body)

    // Create shift
    const shift = await createShift(validatedData)

    return NextResponse.json({ 
      data: shift,
      message: 'Shift created successfully' 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/shifts
 * Update a shift
 */
export async function PUT(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 })
    }

    // Validate update data
    const validatedData = updateShiftSchema.parse(updateData)

    // Update shift
    const shift = await updateShift(id, validatedData)

    return NextResponse.json({ 
      data: shift,
      message: 'Shift updated successfully' 
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'Shift not found') {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    console.error('Error in PUT /api/shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/shifts
 * Delete a shift
 */
export async function DELETE(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 })
    }

    // Delete shift
    await deleteShift(id)

    return NextResponse.json({ 
      message: 'Shift deleted successfully' 
    })

  } catch (error) {
    if (error instanceof Error && error.message === 'Shift not found') {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    console.error('Error in DELETE /api/shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 