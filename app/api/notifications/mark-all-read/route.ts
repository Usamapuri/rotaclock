import { NextRequest, NextResponse } from 'next/server'
import { markAllNotificationsAsRead } from '@/lib/notification-service'
import { createApiAuthMiddleware, withRlsTenant } from '@/lib/api-auth'

async function _PUT(request: NextRequest) {
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
// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const PUT = withRlsTenant(_PUT)
