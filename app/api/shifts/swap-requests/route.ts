import { NextRequest, NextResponse } from 'next/server'
import { query, getShiftSwaps, createShiftSwap } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schemas
const createShiftSwapSchema = z.object({
  requester_id: z.string().uuid('Invalid requester ID'),
  target_id: z.string().uuid('Invalid target ID'),
  original_shift_id: z.string().uuid('Invalid original shift ID'),
  requested_shift_id: z.string().uuid('Invalid requested shift ID'),
  reason: z.string().optional()
})

/**
 * GET /api/shifts/swap-requests
 * Get shift swap requests with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const requester_id = searchParams.get('requester_id')
    const target_id = searchParams.get('target_id')
    const status = searchParams.get('status')

    // Build filters
    const filters: any = {}
    if (requester_id) filters.requester_id = requester_id
    if (target_id) filters.target_id = target_id
    if (status) filters.status = status

    // Get shift swaps
    const swaps = await getShiftSwaps(filters)

    return NextResponse.json({
      data: swaps
    })

  } catch (error) {
    console.error('Error in GET /api/shifts/swap-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/shifts/swap-requests
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createShiftSwapSchema.parse(body)

    // Check if requester exists and is active
    const requesterResult = await query(
      'SELECT id FROM employees_new WHERE id = $1 AND is_active = true',
      [validatedData.requester_id]
    )

    if (requesterResult.rows.length === 0) {
      return NextResponse.json({ error: 'Requester not found or inactive' }, { status: 404 })
    }

    // Check if target exists and is active
    const targetResult = await query(
      'SELECT id FROM employees_new WHERE id = $1 AND is_active = true',
      [validatedData.target_id]
    )

    if (targetResult.rows.length === 0) {
      return NextResponse.json({ error: 'Target employee not found or inactive' }, { status: 404 })
    }

    // Check if original shift assignment exists
    const originalShiftResult = await query(
      'SELECT id FROM shift_assignments_new WHERE id = $1 AND employee_id = $2',
      [validatedData.original_shift_id, validatedData.requester_id]
    )

    if (originalShiftResult.rows.length === 0) {
      return NextResponse.json({ error: 'Original shift assignment not found' }, { status: 404 })
    }

    // Check if requested shift assignment exists
    const requestedShiftResult = await query(
      'SELECT id FROM shift_assignments_new WHERE id = $1 AND employee_id = $2',
      [validatedData.requested_shift_id, validatedData.target_id]
    )

    if (requestedShiftResult.rows.length === 0) {
      return NextResponse.json({ error: 'Requested shift assignment not found' }, { status: 404 })
    }

    // Check for existing swap request
    const existingSwapResult = await query(
      `SELECT id FROM shift_swaps 
       WHERE requester_id = $1 
       AND target_id = $2 
       AND original_shift_id = $3 
       AND requested_shift_id = $4 
       AND status = 'pending'`,
      [validatedData.requester_id, validatedData.target_id, validatedData.original_shift_id, validatedData.requested_shift_id]
    )

    if (existingSwapResult.rows.length > 0) {
      return NextResponse.json({ 
        error: 'Swap request already exists for these shifts' 
      }, { status: 409 })
    }

    // Create shift swap
    const swap = await createShiftSwap(validatedData)

    return NextResponse.json({ 
      data: swap,
      message: 'Shift swap request created successfully' 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/shifts/swap-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 