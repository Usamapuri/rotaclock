import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Simple verification test - step by step')
    
    // Step 1: Parse request
    console.log('Step 1: Parsing request...')
    const { imageData, employeeId, verificationType = 'shift_start' } = await request.json()
    console.log('✅ Request parsed:', { hasImageData: !!imageData, employeeId, verificationType })
    
    // Step 2: Basic validation
    console.log('Step 2: Basic validation...')
    if (!imageData || !employeeId) {
      console.log('❌ Missing required data')
      return NextResponse.json(
        { error: 'Image data and employee ID are required' },
        { status: 400 }
      )
    }
    console.log('✅ Basic validation passed')
    
    // Step 3: Import database functions
    console.log('Step 3: Importing database functions...')
    const { getEmployeeByEmail } = await import('@/lib/database')
    console.log('✅ Database functions imported')
    
    // Step 4: Get employee
    console.log('Step 4: Getting employee...')
    const email = employeeId
    const employee = await getEmployeeByEmail(email)
    if (!employee) {
      console.log('❌ Employee not found')
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }
    console.log('✅ Employee found:', employee.employee_id)
    
    // Step 5: Create timestamp
    console.log('Step 5: Creating timestamp...')
    const timestamp = new Date().toISOString()
    console.log('✅ Timestamp created:', timestamp)
    
    // Step 6: Import file system
    console.log('Step 6: Importing file system...')
    const { writeFileSync, appendFileSync, existsSync } = await import('fs')
    const { join } = await import('path')
    console.log('✅ File system imported')
    
    // Step 7: File operations
    console.log('Step 7: File operations...')
    try {
      const csvPath = join(process.cwd(), 'verification_logs.csv')
      const csvRow = `${employee.employee_id},${employee.id},${verificationType},${timestamp},verified\n`
      appendFileSync(csvPath, csvRow)
      console.log('✅ CSV written')
      
      const imageDir = join(process.cwd(), 'verification_images')
      const imagePath = join(imageDir, `test_${Date.now()}.txt`)
      writeFileSync(imagePath, imageData)
      console.log('✅ Image written')
    } catch (fsError) {
      const err = fsError as Error
      console.log('❌ File system error:', err.message)
      return NextResponse.json(
        { error: 'File system error', details: err.message },
        { status: 500 }
      )
    }
    
    console.log('🎉 All steps completed successfully!')
    
    return NextResponse.json({
      success: true,
      message: 'Simple verification successful',
      data: {
        email,
        employee_id: employee.employee_id,
        timestamp
      }
    })
    
  } catch (error) {
    const err = error as Error
    console.error('❌ Simple verification error:', err)
    return NextResponse.json(
      { error: 'Simple verification failed', details: err.message },
      { status: 500 }
    )
  }
}
