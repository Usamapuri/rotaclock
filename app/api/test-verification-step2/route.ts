import { NextRequest, NextResponse } from 'next/server'
import { getEmployeeByEmail } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test verification step 2 - testing getEmployeeByEmail')
    
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

    console.log('🔍 Email determined:', email)

    if (!email) {
      console.log('❌ No valid email found')
      return NextResponse.json(
        { error: 'Valid email is required for verification' },
        { status: 400 }
      )
    }

    console.log('✅ Email validation passed')

    // Test getEmployeeByEmail
    console.log('🔍 Testing getEmployeeByEmail with:', email)
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

    console.log('🎉 Step 2 tests passed!')

    return NextResponse.json({
      success: true,
      message: 'Step 2 verification successful',
      data: {
        email,
        employee: {
          id: employee.id,
          employee_id: employee.employee_id,
          name: `${employee.first_name} ${employee.last_name}`
        }
      }
    })

  } catch (error) {
    console.error('❌ Step 2 verification error:', error)
    return NextResponse.json(
      { error: 'Step 2 verification failed', details: error.message },
      { status: 500 }
    )
  }
}
