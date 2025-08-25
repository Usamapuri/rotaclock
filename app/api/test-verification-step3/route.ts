import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, appendFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getEmployeeByEmail } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test verification step 3 - testing file system operations')
    
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

    // Test file system operations
    console.log('🔍 Testing file system operations...')
    
    try {
      // Create verification data
      const timestamp = new Date().toISOString()
      const verificationData = {
        employee_id: employee.employee_id,
        user_id: employee.id,
        verification_type: verificationType,
        timestamp: timestamp,
        image_data: imageData,
        status: 'verified'
      }

      console.log('✅ Verification data created')

      // Save to CSV file
      const csvPath = join(process.cwd(), 'verification_logs.csv')
      const csvHeader = 'employee_id,user_id,verification_type,timestamp,status\n'
      const csvRow = `${verificationData.employee_id},${verificationData.user_id},${verificationData.verification_type},${verificationData.timestamp},${verificationData.status}\n`

      console.log('📁 CSV path:', csvPath)

      // Create file with header if it doesn't exist
      if (!existsSync(csvPath)) {
        console.log('📝 Creating CSV file with header...')
        writeFileSync(csvPath, csvHeader)
      }

      // Append the verification record
      console.log('📝 Appending to CSV...')
      appendFileSync(csvPath, csvRow)

      console.log('✅ CSV operations successful')

      // Save the actual image data to a separate file (base64 encoded)
      const imageFileName = `verification_${employee.employee_id}_${Date.now()}.txt`
      const imageDir = join(process.cwd(), 'verification_images')
      const imagePath = join(imageDir, imageFileName)
      
      console.log('📁 Image path:', imagePath)
      
      // Ensure the directory exists
      if (!existsSync(imageDir)) {
        console.log('📁 Creating image directory...')
        const fs = require('fs')
        fs.mkdirSync(imageDir, { recursive: true })
      }

      // Save the base64 image data
      console.log('📝 Writing image file...')
      writeFileSync(imagePath, imageData)

      console.log('✅ Image file operations successful')
      console.log(`📸 Verification photo saved for employee ${employee.employee_id} (${email}) at ${timestamp}`)

    } catch (fsError) {
      const err = fsError as Error
      console.error('❌ File system error:', err)
      return NextResponse.json(
        { error: 'File system error', details: err.message },
        { status: 500 }
      )
    }

    console.log('🎉 Step 3 tests passed!')

    return NextResponse.json({
      success: true,
      message: 'Step 3 verification successful',
      data: {
        email,
        employee: {
          id: employee.id,
          employee_id: employee.employee_id,
          name: `${employee.first_name} ${employee.last_name}`
        },
        verification_id: `${employee.employee_id}_${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    const err = error as Error
    console.error('❌ Step 3 verification error:', err)
    return NextResponse.json(
      { error: 'Step 3 verification failed', details: err.message },
      { status: 500 }
    )
  }
}
