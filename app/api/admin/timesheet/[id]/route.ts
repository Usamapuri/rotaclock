import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'
import { z } from 'zod'

const editTimesheetSchema = z.object({
  clock_in: z.string().optional(),
  clock_out: z.string().optional(),
  break_hours: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Access denied. Admin or manager role required.' }, { status: 403 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = editTimesheetSchema.parse(body)

    const teResult = await query(
      `SELECT * FROM time_entries 
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )

    if (teResult.rows.length > 0) {
      const currentEntry = teResult.rows[0]
      let newTotalHours = currentEntry.total_hours
      if (validatedData.clock_in || validatedData.clock_out) {
        const clockIn = validatedData.clock_in
          ? new Date(validatedData.clock_in)
          : new Date(currentEntry.clock_in)
        const clockOut = validatedData.clock_out
          ? new Date(validatedData.clock_out)
          : new Date(currentEntry.clock_out)

        if (clockIn && clockOut && !isNaN(clockOut.getTime())) {
          const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
          newTotalHours = Math.max(
            0,
            hoursWorked - (validatedData.break_hours ?? currentEntry.break_hours ?? 0)
          )
        }
      }

      const updateFields: string[] = []
      const updateValues: unknown[] = []
      let paramIndex = 1

      if (validatedData.clock_in !== undefined) {
        updateFields.push(`clock_in = $${paramIndex}`)
        updateValues.push(validatedData.clock_in)
        paramIndex++
      }
      if (validatedData.clock_out !== undefined) {
        updateFields.push(`clock_out = $${paramIndex}`)
        updateValues.push(validatedData.clock_out)
        paramIndex++
      }
      if (validatedData.break_hours !== undefined) {
        updateFields.push(`break_hours = $${paramIndex}`)
        updateValues.push(validatedData.break_hours)
        paramIndex++
      }
      if (validatedData.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`)
        updateValues.push(validatedData.notes)
        paramIndex++
      }
      updateFields.push(`total_hours = $${paramIndex}`)
      updateValues.push(newTotalHours)
      paramIndex++
      updateFields.push(`updated_at = NOW()`)
      if (
        validatedData.clock_in !== undefined ||
        validatedData.clock_out !== undefined ||
        validatedData.break_hours !== undefined
      ) {
        updateFields.push(`approval_status = 'pending'`)
        updateFields.push(`approved_by = NULL`)
        updateFields.push(`approved_at = NULL`)
      }

      const updateQuery = `
        UPDATE time_entries 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `
      updateValues.push(id, tenantContext.tenant_id)
      const updateResult = await query(updateQuery, updateValues)
      if (updateResult.rows.length === 0) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
      }
      try {
        await query(
          `INSERT INTO audit_logs (
            tenant_id, user_id, action, table_name, record_id, old_values, new_values, created_at
          ) VALUES ($1, $2, 'UPDATE', 'time_entries', $3, $4, $5, NOW())`,
          [
            tenantContext.tenant_id,
            user.id,
            id,
            JSON.stringify(currentEntry),
            JSON.stringify(updateResult.rows[0]),
          ]
        )
      } catch {
        /* optional */
      }
      return NextResponse.json({
        success: true,
        row_source: 'time_entry',
        data: updateResult.rows[0],
      })
    }

    const slResult = await query(
      `SELECT * FROM shift_logs WHERE id = $1 AND tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )
    if (slResult.rows.length > 0) {
      const cur = slResult.rows[0]
      const updateFields: string[] = []
      const updateValues: unknown[] = []
      let paramIndex = 1

      if (validatedData.clock_in !== undefined) {
        updateFields.push(`clock_in_time = $${paramIndex}`)
        updateValues.push(validatedData.clock_in)
        paramIndex++
      }
      if (validatedData.clock_out !== undefined) {
        updateFields.push(`clock_out_time = $${paramIndex}`)
        updateValues.push(validatedData.clock_out || null)
        paramIndex++
      }
      if (validatedData.break_hours !== undefined) {
        updateFields.push(`break_time_used = $${paramIndex}`)
        updateValues.push(validatedData.break_hours)
        paramIndex++
      }
      if (validatedData.notes !== undefined) {
        updateFields.push(`shift_remarks = $${paramIndex}`)
        updateValues.push(validatedData.notes)
        paramIndex++
      }

      const newIn = validatedData.clock_in ? new Date(validatedData.clock_in) : new Date(cur.clock_in_time)
      const newOut = validatedData.clock_out
        ? new Date(validatedData.clock_out)
        : cur.clock_out_time
          ? new Date(cur.clock_out_time)
          : null
      if (newOut && !isNaN(newOut.getTime())) {
        const bh = validatedData.break_hours ?? cur.break_time_used ?? 0
        const gross = (newOut.getTime() - newIn.getTime()) / (1000 * 60 * 60)
        updateFields.push(`total_shift_hours = $${paramIndex}`)
        updateValues.push(Math.max(0, gross - Number(bh)))
        paramIndex++
      }

      updateFields.push(`updated_at = NOW()`)
      const updateQuery = `
        UPDATE shift_logs SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `
      updateValues.push(id, tenantContext.tenant_id)
      const upd = await query(updateQuery, updateValues)
      return NextResponse.json({
        success: true,
        row_source: 'shift_log',
        data: upd.rows[0],
      })
    }

    return NextResponse.json({ error: 'Timesheet entry not found' }, { status: 404 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error in PATCH /api/admin/timesheet/[id]:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
