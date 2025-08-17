import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, appendFileSync, existsSync } from 'fs'
import { join } from 'path'
import { AuthService } from '@/lib/auth'
import { query, createShiftLogByEmail, getShiftAssignmentsByEmail, isEmployeeClockedInByEmail, getEmployeeByEmail } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { imageData, employeeId, verificationType = 'shift_start' } = await request.json()

    if (!imageData || !employeeId) {
      return NextResponse.json(
        { error: 'Image data and employee ID are required' },
        { status: 400 }
      )
    }

    // Get current user info
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser && !employeeId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Determine the email to use for verification
    let email = currentUser?.email
    
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
    const employee = await getEmployeeByEmail(email)
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Create verification data
    const timestamp = new Date().toISOString()
    const verificationData = {
      employee_id: employee.employee_id,
      user_id: currentUser?.id || employee.id,
      verification_type: verificationType,
      timestamp: timestamp,
      image_data: imageData,
      status: 'verified'
    }

    // Save to CSV file
    const csvPath = join(process.cwd(), 'verification_logs.csv')
    const csvHeader = 'employee_id,user_id,verification_type,timestamp,status\n'
    const csvRow = `${verificationData.employee_id},${verificationData.user_id},${verificationData.verification_type},${verificationData.timestamp},${verificationData.status}\n`

    // Create file with header if it doesn't exist
    if (!existsSync(csvPath)) {
      writeFileSync(csvPath, csvHeader)
    }

    // Append the verification record
    appendFileSync(csvPath, csvRow)

    // Save the actual image data to a separate file (base64 encoded)
    const imageFileName = `verification_${employee.employee_id}_${Date.now()}.txt`
    const imageDir = join(process.cwd(), 'verification_images')
    const imagePath = join(imageDir, imageFileName)
    
    // Ensure the directory exists
    if (!existsSync(imageDir)) {
      const fs = require('fs')
      fs.mkdirSync(imageDir, { recursive: true })
    }

    // Save the base64 image data
    writeFileSync(imagePath, imageData)

    console.log(`Verification photo saved for employee ${employee.employee_id} (${email}) at ${timestamp}`)

    // If this is a shift start verification, automatically clock in the employee
    let clockInResult = null
    if (verificationType === 'shift_start') {
      try {
        // Check if employee is already clocked in
        const isClockedIn = await isEmployeeClockedInByEmail(email)
        if (!isClockedIn) {
          // Get today's date
          const today = new Date().toISOString().split('T')[0]
          
          // Find today's shift assignment for this employee
          const shiftAssignments = await getShiftAssignmentsByEmail({
            start_date: today,
            end_date: today,
            email: email
          })

          let shift_assignment_id = null
          if (shiftAssignments.length > 0) {
            shift_assignment_id = shiftAssignments[0].id
          }

          // Create shift log (clock in)
          clockInResult = await createShiftLogByEmail({
            email: email,
            shift_assignment_id,
            clock_in_time: timestamp,
            max_break_allowed: 1.0
          })

          // Update employee online status
          await query(`
            UPDATE employees 
            SET is_online = true, last_online = NOW()
            WHERE email = $1
          `, [email])

          console.log(`Employee ${employee.employee_id} (${email}) automatically clocked in after verification`)
        }
      } catch (clockInError) {
        console.error('Error during automatic clock in:', clockInError)
        // Don't fail the verification if clock in fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Verification photo saved successfully',
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
    console.error('Error saving verification photo:', error)
    return NextResponse.json(
      { error: 'Failed to save verification photo' },
      { status: 500 }
    )
  }
}
