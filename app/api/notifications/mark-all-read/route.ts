import { NextRequest, NextResponse } from 'next/server'
import { markAllNotificationsAsRead } from '@/lib/notification-service'
import { createApiAuthMiddleware } from '@/lib/api-auth'

export async function PUT(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const notifications = await markAllNotificationsAsRead(user.id)

    return NextResponse.json({
      success: true,
      data: notifications,
      message: 'All notifications marked as read'
    })

  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 