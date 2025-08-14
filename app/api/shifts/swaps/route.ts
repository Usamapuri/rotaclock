import { NextRequest, NextResponse } from 'next/server'
import { query, getShiftSwaps } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for shift swaps
const createShiftSwapSchema = z.object({
  target_id: z.string().uuid(),
  original_shift_id: z.string().uuid(),
  requested_shift_id: z.string().uuid(),
  reason: z.string().optional()
})

/**
 * GET /api/shifts/swaps
 * Get shift swap requests with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requester_id = searchParams.get('requester_id')
    const target_id = searchParams.get('target_id')
    const status = searchParams.get('status')

    const filters = {
      requester_id: requester_id || undefined,
      target_id: target_id || undefined,
      status: status || undefined
    }

    const shiftSwaps = await getShiftSwaps(filters)

    return NextResponse.json({
      data: shiftSwaps
    })

  } catch (error) {
    console.error('Error in GET /api/shifts/swaps:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/shifts/swaps
 * Create a new shift swap request
 */
export async function POST(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = createShiftSwapSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const swapData = validationResult.data

    // Get current employee for demo purposes
    const employeeResult = await query(`
      SELECT id FROM employees 
      WHERE is_active = true 
      ORDER BY created_at ASC 
      LIMIT 1
    `)

    if (employeeResult.rows.length === 0) {
      return NextResponse.json({ error: 'No active employees found' }, { status: 404 })
    }

    const requesterId = employeeResult.rows[0].id

    // Check if target employee exists
    const targetEmployeeResult = await query(`
      SELECT id FROM employees WHERE id = $1
    `, [swapData.target_id])

    if (targetEmployeeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Target employee not found' }, { status: 404 })
    }

    // Check if shifts exist
    const originalShiftResult = await query(`
      SELECT id FROM shift_assignments WHERE id = $1
    `, [swapData.original_shift_id])

    if (originalShiftResult.rows.length === 0) {
      return NextResponse.json({ error: 'Original shift not found' }, { status: 404 })
    }

    const requestedShiftResult = await query(`
      SELECT id FROM shift_assignments WHERE id = $1
    `, [swapData.requested_shift_id])

    if (requestedShiftResult.rows.length === 0) {
      return NextResponse.json({ error: 'Requested shift not found' }, { status: 404 })
    }

    // Create shift swap request
    const result = await query(`
      INSERT INTO shift_swaps (
        requester_id, target_id, original_shift_id, requested_shift_id, reason, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [
      requesterId,
      swapData.target_id,
      swapData.original_shift_id,
      swapData.requested_shift_id,
      swapData.reason
    ])

    const shiftSwap = result.rows[0]

    return NextResponse.json({ 
      data: shiftSwap,
      message: 'Shift swap request created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/shifts/swaps:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
