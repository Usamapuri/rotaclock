import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { z } from 'zod'

// Validation schema for clock out with shift remarks
const clockOutSchema = z.object({
  employee_id: z.string().uuid(),
  total_calls_taken: z.number().min(0).optional(),
  leads_generated: z.number().min(0).optional(),
  shift_remarks: z.string().optional(),
  performance_rating: z.number().min(1).max(5).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = clockOutSchema.parse(body)

    const { employee_id, total_calls_taken, leads_generated, shift_remarks, performance_rating } = validatedData

    // Simple direct database query to get active shift
    const result = await query(
      'SELECT * FROM shift_logs WHERE employee_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
      [employee_id, 'active']
    )
      
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No active shift found' },
        { status: 404 }
      )
    }

    const currentShift = result.rows[0]
    const clockOutTime = new Date()
    const clockInTime = new Date(currentShift.clock_in_time)
    
    // Calculate total shift duration
    const totalShiftDuration = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60) // hours
    const breakTimeUsed = Number(currentShift.break_time_used) || 0
    const totalHours = totalShiftDuration - breakTimeUsed

    // Update shift log with remarks and performance data
    const updateResult = await query(
      `UPDATE shift_logs SET 
        clock_out_time = $1, 
        total_shift_hours = $2, 
        break_time_used = $3, 
        status = $4,
        total_calls_taken = $5,
        leads_generated = $6,
        shift_remarks = $7,
        performance_rating = $8,
        updated_at = NOW()
      WHERE id = $9 RETURNING *`,
      [
        clockOutTime.toISOString(), 
        totalHours, 
        breakTimeUsed, 
        'completed', 
        total_calls_taken || 0,
        leads_generated || 0,
        shift_remarks || null,
        performance_rating || null,
        currentShift.id
      ]
    )
    
    const updatedShift = updateResult.rows[0]

    // Update employee online status to offline
    await query(`
      UPDATE employees 
      SET is_online = false, last_online = NOW()
      WHERE id = $1
    `, [employee_id])

    return NextResponse.json({
      success: true,
      data: updatedShift,
      message: 'Successfully clocked out with shift details',
      totalShiftDuration: totalShiftDuration.toFixed(2),
      totalWorkHours: totalHours.toFixed(2),
      breakTimeUsed: breakTimeUsed.toFixed(2),
      totalCallsTaken: total_calls_taken || 0,
      leadsGenerated: leads_generated || 0
    })

  } catch (error) {
    console.error('Error in clock out:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to clock out' },
      { status: 500 }
    )
  }
} 