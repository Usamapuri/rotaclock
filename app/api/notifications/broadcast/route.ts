import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export async function POST(request: NextRequest) {
  try {
    const { message, employeeIds, sendToAll } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // If Supabase is not configured, return success for demo purposes
    if (!supabase) {
      console.log('Broadcast message (demo mode):', { message, employeeIds, sendToAll })
      return NextResponse.json({
        success: true,
        message: `Message sent to ${sendToAll ? 'all' : employeeIds?.length || 0} employee(s) (demo mode)`,
        recipients: sendToAll ? 3 : (employeeIds?.length || 0)
      })
    }

    let targetEmployeeIds: string[] = []

    if (sendToAll) {
      // Get all active employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('is_active', true)

      if (empError) {
        console.error('Error fetching employees:', empError)
        return NextResponse.json(
          { error: 'Failed to fetch employees' },
          { status: 500 }
        )
      }

      targetEmployeeIds = employees.map(emp => emp.id)
    } else {
      // Use provided employee IDs
      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return NextResponse.json(
          { error: 'Employee IDs are required when not sending to all' },
          { status: 400 }
        )
      }
      targetEmployeeIds = employeeIds
    }

    // Create notifications for all target employees
    const notifications = targetEmployeeIds.map(employeeId => ({
      employee_id: employeeId,
      title: 'Broadcast Message',
      message: message,
      type: 'broadcast',
      is_read: false,
      created_at: new Date().toISOString()
    }))

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (notificationError) {
      console.error('Error creating notifications:', notificationError)
      return NextResponse.json(
        { error: 'Failed to send broadcast message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Message sent to ${targetEmployeeIds.length} employee(s)`,
      recipients: targetEmployeeIds.length
    })

  } catch (error) {
    console.error('Broadcast message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 