import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test verification endpoint called')
    
    const { imageData, employeeId, verificationType = 'shift_start' } = await request.json()
    
    console.log('📥 Received data:', { 
      hasImageData: !!imageData, 
      employeeId, 
      verificationType,
      imageDataLength: imageData?.length 
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

    // Test file system operations
    const fs = require('fs')
    const path = require('path')
    
    try {
      const testDir = path.join(process.cwd(), 'test_verification')
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true })
      }
      
      const testFile = path.join(testDir, 'test.txt')
      fs.writeFileSync(testFile, 'test')
      
      console.log('✅ File system operations successful')
    } catch (fsError) {
      console.error('❌ File system error:', fsError)
      return NextResponse.json(
        { error: 'File system error', details: fsError.message },
        { status: 500 }
      )
    }

    // Test database connection
    try {
      const { query } = await import('@/lib/database')
      const result = await query('SELECT 1 as test')
      console.log('✅ Database connection successful:', result.rows[0])
    } catch (dbError) {
      console.error('❌ Database error:', dbError)
      return NextResponse.json(
        { error: 'Database error', details: dbError.message },
        { status: 500 }
      )
    }

    console.log('🎉 All tests passed!')

    return NextResponse.json({
      success: true,
      message: 'Test verification successful',
      data: {
        employeeId,
        verificationType,
        imageDataLength: imageData.length
      }
    })

  } catch (error) {
    console.error('❌ Test verification error:', error)
    return NextResponse.json(
      { error: 'Test verification failed', details: error.message },
      { status: 500 }
    )
  }
}
