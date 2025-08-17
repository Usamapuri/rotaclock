import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, appendFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getEmployeeByEmail, isEmployeeClockedInByEmail, getShiftAssignmentsByEmail, createShiftLogByEmail, query } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test verification step 4 - testing shift log creation')
    
    const { imageData, employeeId, verificationType = 'shift_start' } = await request.json()
    
    console.log('📥 Received data:', { 
      hasImageData: !!imageData, 
      employeeId, 
      verificationType
    })

    // Basic validation
    if (!imageData || !employeeId) {
      console.log('❌ Missing required data')
      return NextResponse.json(
        { error: 'Image data and employee ID are required' },
        { status: 400 }
      )
    }

    console.log('✅ Basic validation passed')

    // Get employee
    const email = employeeId
    const employee = await getEmployeeByEmail(email)
    
    if (!employee) {
      console.log('❌ Employee not found for email:', email)
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }
    
    console.log('✅ Employee found:', { 
      id: employee.id, 
      employee_id: employee.employee_id, 
      name: `${employee.first_name} ${employee.last_name}` 
    })

    // Test file system operations (simplified)
    console.log('🔍 Testing file system operations...')
    
    try {
      const timestamp = new Date().toISOString()
      
      // Save to CSV file
      const csvPath = join(process.cwd(), 'verification_logs.csv')
      const csvRow = `${employee.employee_id},${employee.id},${verificationType},${timestamp},verified\n`
      appendFileSync(csvPath, csvRow)
      console.log('✅ CSV operations successful')

      // Save image file
      const imageFileName = `verification_${employee.employee_id}_${Date.now()}.txt`
      const imageDir = join(process.cwd(), 'verification_images')
      const imagePath = join(imageDir, imageFileName)
      writeFileSync(imagePath, imageData)
      console.log('✅ Image file operations successful')

    } catch (fsError) {
      console.error('❌ File system error:', fsError)
      return NextResponse.json(
        { error: 'File system error', details: fsError.message },
        { status: 500 }
      )
    }

    // Test shift log creation
    console.log('🔍 Testing shift log creation...')
    
    try {
      const timestamp = new Date().toISOString()
      
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
        const clockInResult = await createShiftLogByEmail({
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
        
        return NextResponse.json({
          success: true,
          message: 'Step 4 verification successful',
          data: {
            email,
            employee: {
              id: employee.id,
              employee_id: employee.employee_id,
              name: `${employee.first_name} ${employee.last_name}`
            },
            verification_id: `${employee.employee_id}_${Date.now()}`,
            timestamp: timestamp,
            clocked_in: true,
            shift_log: clockInResult
          }
        })
      } else {
        console.log('   Employee already clocked in, skipping clock-in process')
        
        return NextResponse.json({
          success: true,
          message: 'Step 4 verification successful (already clocked in)',
          data: {
            email,
            employee: {
              id: employee.id,
              employee_id: employee.employee_id,
              name: `${employee.first_name} ${employee.last_name}`
            },
            verification_id: `${employee.employee_id}_${Date.now()}`,
            timestamp: timestamp,
            clocked_in: false
          }
        })
      }
    } catch (shiftError) {
      console.error('❌ Shift log creation error:', shiftError)
      return NextResponse.json(
        { error: 'Shift log creation failed', details: shiftError.message },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Step 4 verification error:', error)
    return NextResponse.json(
      { error: 'Step 4 verification failed', details: error.message },
      { status: 500 }
    )
  }
}
