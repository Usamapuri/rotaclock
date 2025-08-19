import { NextRequest, NextResponse } from 'next/server'
import { query, createShiftAssignment } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'
import { z } from 'zod'

const createAssignmentSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  shift_id: z.string().uuid('Invalid shift ID'),
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  status: z.enum(['assigned', 'confirmed', 'completed', 'cancelled', 'swap-requested']).default('assigned'),
  notes: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createAssignmentSchema.parse(body)

    // Ensure employee is within PM scope
    const scopeRes = await query(
      `SELECT 1 FROM manager_teams mt
       JOIN employees e ON e.team_id = mt.team_id
       WHERE mt.manager_id = $1 AND e.id = $2 AND e.is_active = true
       LIMIT 1`,
      [user!.id, data.employee_id]
    )
    if (scopeRes.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden: employee not in your teams' }, { status: 403 })
    }

    // Ensure shift exists
    const shiftRes = await query('SELECT id FROM shifts WHERE id = $1 AND is_active = true', [data.shift_id])
    if (shiftRes.rows.length === 0) {
      return NextResponse.json({ error: 'Shift not found or inactive' }, { status: 404 })
    }

    const created = await createShiftAssignment({
      employee_id: data.employee_id,
      shift_id: data.shift_id,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      status: data.status,
      assigned_by: user!.id,
      notes: data.notes,
      created_at: '' as any,
      updated_at: '' as any,
      id: '' as any,
    } as any)

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('POST /api/project-manager/shifts/assignments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


