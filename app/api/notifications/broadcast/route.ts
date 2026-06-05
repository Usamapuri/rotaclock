import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { sendBroadcastMessage, sendBroadcastToAllEmployees } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { message, employeeIds, sendToAll } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    let notifications = []

    if (sendToAll) {
      // Send to all active employees
      console.log('📢 Sending broadcast to all employees...')
      notifications = await sendBroadcastToAllEmployees(message)
      console.log(`✅ Broadcast sent to ${notifications.length} employees`)
    } else {
      // Send to specific employees
      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return NextResponse.json(
          { error: 'Employee IDs are required when not sending to all' },
          { status: 400 }
        )
      }
      console.log(`📢 Sending broadcast to ${employeeIds.length} specific employees...`)
      notifications = await sendBroadcastMessage(message, employeeIds)
      console.log(`✅ Broadcast sent to ${notifications.length} employees`)
    }

    return NextResponse.json({
      success: true,
      message: `Message sent to ${notifications.length} employee(s)`,
      recipients: notifications.length,
      notifications: notifications
    })

  } catch (error) {
    console.error('Broadcast message error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 