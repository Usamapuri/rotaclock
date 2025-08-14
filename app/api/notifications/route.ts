import { NextRequest, NextResponse } from 'next/server'
import { getNotifications, createNotification } from '@/lib/notification-service'
import { createApiAuthMiddleware } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const read = searchParams.get('read')
    const type = searchParams.get('type')

    const notifications = await getNotifications(user.id, {
      limit,
      read: read === null ? undefined : read === 'true',
      type: type || undefined
    })

    return NextResponse.json({
      success: true,
      data: notifications
    })

  } catch (error) {
    console.error('Error getting notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { user_id, title, message, type = 'info', action_url } = body

    if (!user_id || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const notification = await createNotification({
      user_id,
      title,
      message,
      type,
      read: false,
      action_url
    })

    return NextResponse.json({
      success: true,
      data: notification,
      message: 'Notification sent successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 