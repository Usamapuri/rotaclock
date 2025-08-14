import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { employee_id } = await request.json()

    if (!employee_id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

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

      // Update shift log directly
      const updateResult = await query(
        `UPDATE shift_logs SET 
          clock_out_time = $1, 
          total_shift_hours = $2, 
          break_time_used = $3, 
          status = $4,
          updated_at = NOW()
        WHERE id = $5 RETURNING *`,
        [clockOutTime.toISOString(), totalHours, breakTimeUsed, 'completed', currentShift.id]
      )
      
      const updatedShift = updateResult.rows[0]

      return NextResponse.json({
        success: true,
        data: updatedShift,
        message: 'Successfully clocked out',
        totalShiftDuration: totalShiftDuration.toFixed(2),
        totalWorkHours: totalHours.toFixed(2),
        breakTimeUsed: breakTimeUsed.toFixed(2)
      })

  } catch (error) {
    console.error('Error in clock out:', error)
    return NextResponse.json(
      { error: 'Failed to clock out' },
      { status: 500 }
    )
  }
} 