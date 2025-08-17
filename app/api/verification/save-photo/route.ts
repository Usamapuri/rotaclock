import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, appendFileSync, existsSync } from 'fs'
import { join } from 'path'
import { AuthService } from '@/lib/auth'
import { query, createShiftLog, getShiftAssignments, isEmployeeClockedIn } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { imageData, employeeId, verificationType = 'shift_start' } = await request.json()

    if (!imageData || !employeeId) {
      return NextResponse.json(
        { error: 'Image data and employee ID are required' },
        { status: 400 }
      )
    }

    // Get current user info - for demo purposes, allow if employeeId is provided
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser && !employeeId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Determine if employeeId is a UUID or employee ID string for logging
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId)
    let employeeIdString = employeeId
    
    if (isUuid) {
      // If it's a UUID, get the employee ID string for logging
      const employeeResult = await query(`
        SELECT employee_id FROM employees WHERE id = $1
      `, [employeeId])
      
      if (employeeResult.rows.length > 0) {
        employeeIdString = employeeResult.rows[0].employee_id
      }
    }
    
    // Create verification data
    const timestamp = new Date().toISOString()
    const verificationData = {
      employee_id: employeeIdString,
      user_id: currentUser?.id || employeeId,
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
    const imageFileName = `verification_${employeeId}_${Date.now()}.txt`
    const imageDir = join(process.cwd(), 'verification_images')
    const imagePath = join(imageDir, imageFileName)
    
    // Ensure the directory exists
    if (!existsSync(imageDir)) {
      // Create directory recursively
      const fs = require('fs')
      fs.mkdirSync(imageDir, { recursive: true })
    }

    // Save the base64 image data
    writeFileSync(imagePath, imageData)

    console.log(`Verification photo saved for employee ${employeeId} at ${timestamp}`)

    // If this is a shift start verification, automatically clock in the employee
    let clockInResult = null
    if (verificationType === 'shift_start') {
      try {
        // Determine if employeeId is a UUID or employee ID string
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId)
        
        let employeeUuid = employeeId
        let employeeIdString = employeeId
        
        // If it's not a UUID, we need to get the UUID from the database
        if (!isUuid) {
          const employeeResult = await query(`
            SELECT id, employee_id FROM employees WHERE employee_id = $1
          `, [employeeId])
          
          if (employeeResult.rows.length > 0) {
            employeeUuid = employeeResult.rows[0].id
            employeeIdString = employeeResult.rows[0].employee_id
          } else {
            throw new Error('Employee not found')
          }
        } else {
          // If it's a UUID, get the employee ID string for logging
          const employeeResult = await query(`
            SELECT employee_id FROM employees WHERE id = $1
          `, [employeeId])
          
          if (employeeResult.rows.length > 0) {
            employeeIdString = employeeResult.rows[0].employee_id
          }
        }
        
        // Check if employee is already clocked in
        const isClockedIn = await isEmployeeClockedIn(employeeUuid)
        if (!isClockedIn) {
          // Get today's date
          const today = new Date().toISOString().split('T')[0]
          
          // Find today's shift assignment for this employee
          const shiftAssignments = await getShiftAssignments({
            start_date: today,
            end_date: today,
            employee_id: employeeUuid
          })

          let shift_assignment_id = null
          if (shiftAssignments.length > 0) {
            shift_assignment_id = shiftAssignments[0].id
          }

          // Create shift log (clock in)
          clockInResult = await createShiftLog({
            employee_id: employeeUuid,
            shift_assignment_id,
            clock_in_time: timestamp,
            break_time_used: 0,
            max_break_allowed: 1.0,
            is_late: false,
            is_no_show: false,
            late_minutes: 0,
            status: 'active'
          })

          // Update employee online status
          await query(`
            UPDATE employees 
            SET is_online = true, last_online = NOW()
            WHERE id = $1
          `, [employeeUuid])

          console.log(`Employee ${employeeIdString} (${employeeUuid}) automatically clocked in after verification`)
        }
      } catch (clockInError) {
        console.error('Error during automatic clock in:', clockInError)
        // Don't fail the verification if clock in fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Verification photo saved successfully',
      verification_id: `${employeeId}_${Date.now()}`,
      timestamp: timestamp,
      clocked_in: !!clockInResult,
      shift_log: clockInResult
    })

  } catch (error) {
    console.error('Error saving verification photo:', error)
    return NextResponse.json(
      { error: 'Failed to save verification photo' },
      { status: 500 }
    )
  }
}
