import { NextRequest, NextResponse } from 'next/server'
import { query, createTimeEntry, updateTimeEntry, getCurrentTimeEntry, getCurrentEmployee, isEmployeeClockedIn } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for attendance marking
const attendanceSchema = z.object({
  action: z.enum(['clock-in', 'clock-out']),
  verification_data: z.object({
    face_verified: z.boolean(),
    location_verified: z.boolean().optional(),
    timestamp: z.string(),
    confidence_score: z.number().min(0).max(1).optional()
  }),
  notes: z.string().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  shift_assignment_id: z.string().uuid().optional()
})

/**
 * POST /api/time/attendance
 * Mark attendance with camera verification
 */
export async function POST(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current employee
    const employee = await getCurrentEmployee()

    // Parse and validate request body
    const body = await request.json()
    const validatedData = attendanceSchema.parse(body)

    // Verify camera verification passed
    if (!validatedData.verification_data.face_verified) {
      return NextResponse.json({ 
        error: 'Face verification failed. Please try again.' 
      }, { status: 400 })
    }

    // Check confidence score if provided
    if (validatedData.verification_data.confidence_score && 
        validatedData.verification_data.confidence_score < 0.8) {
      return NextResponse.json({ 
        error: 'Face verification confidence too low. Please try again.' 
      }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (validatedData.action === 'clock-in') {
      // Check if already clocked in
      const isClockedIn = await isEmployeeClockedIn(employee.id)
      if (isClockedIn) {
        return NextResponse.json({ 
          error: 'Already clocked in',
          data: {
            employee_id: employee.id
          }
        }, { status: 409 })
      }

      // Check if there's a scheduled shift for today
      let shiftAssignmentId = validatedData.shift_assignment_id
      if (!shiftAssignmentId) {
        const todayShiftResult = await query(`
          SELECT id, status 
          FROM shift_assignments 
          WHERE employee_id = $1 
          AND date = $2
          AND status IN ('assigned', 'confirmed')
        `, [employee.id, new Date().toISOString().split('T')[0]])

        if (todayShiftResult.rows.length > 0) {
          shiftAssignmentId = todayShiftResult.rows[0].id
        }
      }

      // Create time entry
      const timeEntryData = {
        employee_id: employee.id,
        shift_assignment_id: shiftAssignmentId,
        clock_in: now,
        status: 'in-progress' as const,
        notes: validatedData.notes,
        location_lat: validatedData.location_lat,
        location_lng: validatedData.location_lng
      }

      const timeEntry = await createTimeEntry(timeEntryData)

      // Create notification for successful attendance
      await query(`
        INSERT INTO notifications (user_id, title, message, type, read, action_url)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        user.id,
        'Attendance Marked - Clock In',
        `Face verification successful. Clocked in at ${new Date(now).toLocaleTimeString()}`,
        'success',
        false,
        '/employee/dashboard'
      ])

      return NextResponse.json({ 
        data: timeEntry,
        message: 'Attendance marked successfully - Clocked in',
        verification_status: 'verified'
      }, { status: 201 })

    } else if (validatedData.action === 'clock-out') {
      // Get current time entry
      const currentTimeEntry = await getCurrentTimeEntry(employee.id)
      if (!currentTimeEntry) {
        return NextResponse.json({ 
          error: 'No active time entry found. Please clock in first.' 
        }, { status: 404 })
      }

      // Calculate total hours worked
      const clockInTime = new Date(currentTimeEntry.clock_in!)
      const clockOutTime = new Date(now)
      const totalHours = Math.round(((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)) * 100) / 100

      // Update time entry
      const updatedTimeEntry = await updateTimeEntry(currentTimeEntry.id, {
        clock_out: now,
        status: 'completed',
        total_hours: totalHours,
        notes: validatedData.notes || currentTimeEntry.notes,
        location_lat: validatedData.location_lat || currentTimeEntry.location_lat,
        location_lng: validatedData.location_lng || currentTimeEntry.location_lng
      })

      // Create notification for successful attendance
      await query(`
        INSERT INTO notifications (user_id, title, message, type, read, action_url)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        user.id,
        'Attendance Marked - Clock Out',
        `Face verification successful. Clocked out. Total hours: ${totalHours}h`,
        'success',
        false,
        '/employee/dashboard'
      ])

      return NextResponse.json({ 
        data: updatedTimeEntry,
        message: 'Attendance marked successfully - Clocked out',
        total_hours: totalHours,
        verification_status: 'verified'
      })

    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "clock-in" or "clock-out"' 
      }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/time/attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/time/attendance
 * Get attendance history for the current employee
 */
export async function GET(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current employee
    const employee = await getCurrentEmployee()

    const { searchParams } = new URL(request.url)
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let queryText = `
      SELECT 
        te.*,
        sa.date as shift_date,
        s.name as shift_name,
        s.start_time as shift_start_time,
        s.end_time as shift_end_time
      FROM time_entries te
      LEFT JOIN shift_assignments sa ON te.assignment_id = sa.id
      LEFT JOIN shift_templates s ON sa.template_id = s.id
      WHERE te.employee_id = $1
    `
    const params: any[] = [employee.id]
    let paramIndex = 2

    if (start_date) {
      queryText += ` AND te.clock_in >= $${paramIndex}`
      params.push(start_date)
      paramIndex++
    }
    if (end_date) {
      queryText += ` AND te.clock_in <= $${paramIndex}`
      params.push(end_date)
      paramIndex++
    }

    queryText += ' ORDER BY te.clock_in DESC'

    // Apply pagination
    const offset = (page - 1) * limit
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await query(queryText, params)

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM time_entries te
      WHERE te.employee_id = $1
      ${start_date ? 'AND te.clock_in >= $2' : ''}
      ${end_date ? `AND te.clock_in <= $${start_date ? '3' : '2'}` : ''}
    `
    const countParams = [employee.id]
    if (start_date) countParams.push(start_date)
    if (end_date) countParams.push(end_date)
    
    const countResult = await query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    return NextResponse.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/time/attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
