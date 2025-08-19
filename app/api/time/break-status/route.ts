import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBreak } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    const currentBreak = await getCurrentBreak(employeeId)

    return NextResponse.json({
      success: true,
      data: currentBreak,
      message: currentBreak ? 'Active break found' : 'No active break'
    })

  } catch (error) {
    console.error('Error getting break status:', error)
    return NextResponse.json(
      { error: 'Failed to get break status' },
      { status: 500 }
    )
  }
}
