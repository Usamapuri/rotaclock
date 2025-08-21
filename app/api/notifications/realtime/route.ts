import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { withPerformanceMonitoring } from '@/lib/performance'

export async function GET(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set up SSE headers
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (data: any, eventType: string = 'update') => {
          const event = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(event))
        }

        const sendHeartbeat = () => {
          sendEvent({ timestamp: new Date().toISOString() }, 'heartbeat')
        }

        // Send initial data
        const sendInitialData = async () => {
          try {
            const notifications = await getNotifications(user!.id)
            const unreadCount = await getUnreadCount(user!.id)

            sendEvent({
              type: 'initial',
              data: {
                notifications,
                unreadCount
              }
            }, 'notifications')
          } catch (error) {
            console.error('Error sending initial notifications data:', error)
            sendEvent({ type: 'error', message: 'Failed to load initial data' }, 'error')
          }
        }

        // Send real-time updates
        const sendUpdates = async () => {
          try {
            const notifications = await getNotifications(user!.id)
            const unreadCount = await getUnreadCount(user!.id)

            sendEvent({
              type: 'update',
              data: {
                notifications,
                unreadCount
              }
            }, 'notifications')
          } catch (error) {
            console.error('Error sending notifications updates:', error)
          }
        }

        // Initial data
        sendInitialData()

        // Set up intervals
        const heartbeatInterval = setInterval(sendHeartbeat, 30000) // 30 seconds
        const updateInterval = setInterval(sendUpdates, 10000) // 10 seconds

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval)
          clearInterval(updateInterval)
          controller.close()
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  } catch (error) {
    console.error('Notifications realtime error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getNotifications(userId: string) {
  const result = await query(`
    SELECT 
      id,
      title,
      message,
      type,
      is_read,
      created_at,
      related_id
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [userId])

  return result.rows
}

async function getUnreadCount(userId: string) {
  const result = await query(`
    SELECT COUNT(*) as unread_count
    FROM notifications
    WHERE user_id = $1 AND is_read = false
  `, [userId])

  return parseInt(result.rows[0]?.unread_count || '0')
}
