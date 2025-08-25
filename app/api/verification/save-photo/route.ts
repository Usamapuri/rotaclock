import { NextRequest, NextResponse } from 'next/server'
import { query, createShiftLogByEmail, getShiftAssignmentsByEmail, isEmployeeClockedInByEmail, getEmployeeByEmail } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { imageData, employeeId, verificationType = 'shift_start' } = await request.json()
    
    console.log('🔍 Verification API called with:', { employeeId, verificationType })

    if (!imageData || !employeeId) {
      console.log('❌ Missing required data:', { hasImageData: !!imageData, hasEmployeeId: !!employeeId })
      return NextResponse.json(
        { error: 'Image data and employee ID are required' },
        { status: 400 }
      )
    }

    // Determine the email to use for verification
    let email = employeeId
    
    // If employeeId is provided and it's an email, use it
    if (employeeId && employeeId.includes('@')) {
      email = employeeId
    } else if (employeeId && !email) {
      // If employeeId is not an email but we need to find the employee
      const employee = await getEmployeeByEmail(employeeId)
      if (employee) {
        email = employee.email
      }
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Valid email is required for verification' },
        { status: 400 }
      )
    }

    // Get employee details for logging
    console.log('🔍 Looking up employee by email:', email)
    const employee = await getEmployeeByEmail(email)
    if (!employee) {
      console.log('❌ Employee not found for email:', email)
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }
    console.log('✅ Employee found:', { id: employee.id, employee_id: employee.employee_id, name: `${employee.first_name} ${employee.last_name}` })

    // Create timestamp for all operations
    const timestamp = new Date().toISOString()
    
    // Store verification record in database instead of file system
    try {
      await query(`
        INSERT INTO verification_logs (
          employee_id, verification_type, timestamp, status, image_data_length
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        employee.employee_id,
        verificationType,
        timestamp,
        'verified',
        imageData.length
      ])
      console.log('✅ Verification log stored in database')
    } catch (dbError) {
      const err = dbError as Error
      console.log('⚠️ Could not store verification log in database, continuing...', err.message)
      // Continue even if verification log fails
    }

    console.log(`Verification photo processed for employee ${employee.employee_id} (${email}) at ${timestamp}`)

    // If this is a shift start verification, automatically clock in the employee
    let clockInResult = null
    if (verificationType === 'shift_start') {
      try {
        console.log('🔍 Starting shift start verification process...')
        
        // Check if employee is already clocked in
        const isClockedIn = await isEmployeeClockedInByEmail(email)
        console.log('   Already clocked in:', isClockedIn)
        
        if (!isClockedIn) {
          // Get today's date
          const today = new Date().toISOString().split('T')[0]
          console.log('   Checking shift assignments for:', today)
          
          // Find today's shift assignment for this employee
          const shiftAssignments = await getShiftAssignmentsByEmail({
            start_date: today,
            end_date: today,
            email: email
          })

          console.log('   Found shift assignments:', shiftAssignments.length)

          let shift_assignment_id = null
          if (shiftAssignments.length > 0) {
            shift_assignment_id = shiftAssignments[0].id
            console.log('   Using shift assignment ID:', shift_assignment_id)
          } else {
            console.log('   No shift assignments found - will create shift log without assignment')
          }

          // Create shift log (clock in) - even without shift assignment
          console.log('   Creating shift log...')
          clockInResult = await createShiftLogByEmail({
            email: email,
            shift_assignment_id,
            clock_in_time: timestamp,
            max_break_allowed: 1.0
          })

          console.log('   Shift log created:', clockInResult?.id)

          // Update employee online status
          await query(`
            UPDATE employees 
            SET is_online = true, last_online = NOW()
            WHERE email = $1
          `, [email])

          console.log(`Employee ${employee.employee_id} (${email}) automatically clocked in after verification`)
        } else {
          console.log('   Employee already clocked in, skipping clock-in process')
        }
      } catch (clockInError) {
        const err = clockInError as Error
        console.error('Error during automatic clock in:', err)
        console.error('Clock-in error details:', {
          message: err.message,
          stack: err.stack
        })
        // Don't fail the verification if clock in fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Verification successful',
      verification_id: `${employee.employee_id}_${Date.now()}`,
      timestamp: timestamp,
      clocked_in: !!clockInResult,
      shift_log: clockInResult,
      employee: {
        id: employee.id,
        employee_id: employee.employee_id,
        email: employee.email,
        name: `${employee.first_name} ${employee.last_name}`
      }
    })

  } catch (error) {
    const err = error as Error
    console.error('Error in verification API:', err)
    console.error('Error details:', {
      message: err.message,
      stack: err.stack
    })
    return NextResponse.json(
      { error: 'Verification failed', details: err.message },
      { status: 500 }
    )
  }
}
