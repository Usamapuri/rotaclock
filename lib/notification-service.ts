import { query } from './database'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'schedule' | 'time' | 'leave' | 'swap' | 'broadcast' | 'shift_assigned' | 'shift_reminder'
  read: boolean
  action_url?: string
  created_at: string
}

export interface NotificationSettings {
  scheduleChanges: boolean
  shiftReminders: boolean
  swapRequests: boolean
  leaveApprovals: boolean
  announcements: boolean
  broadcastMessages: boolean
  emailNotifications: boolean
  pushNotifications: boolean
}

/**
 * Create a notification for a user
 */
export async function createNotification(notification: Omit<Notification, 'id' | 'created_at'>) {
  try {
    const result = await query(`
      INSERT INTO notifications (user_id, title, message, type, read, action_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      notification.user_id,
      notification.title,
      notification.message,
      notification.type,
      notification.read,
      notification.action_url
    ])

    return result.rows[0]
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Get notifications for a user
 */
export async function getNotifications(userId: string, options: {
  limit?: number
  read?: boolean
  type?: string
} = {}) {
  try {
    const { limit = 50, read, type } = options
    
    let sql = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `
    const params: any[] = [userId]
    let paramIndex = 2

    if (read !== undefined) {
      sql += ` AND read = $${paramIndex}`
      params.push(read)
      paramIndex++
    }

    if (type) {
      sql += ` AND type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex}`
    params.push(limit)

    const result = await query(sql, params)
    return result.rows
  } catch (error) {
    console.error('Error getting notifications:', error)
    throw error
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const result = await query(`
      UPDATE notifications 
      SET read = true 
      WHERE id = $1 
      RETURNING *
    `, [notificationId])

    return result.rows[0]
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const result = await query(`
      UPDATE notifications 
      SET read = true 
      WHERE user_id = $1 AND read = false
      RETURNING *
    `, [userId])

    return result.rows
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string) {
  try {
    const result = await query(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = $1 AND read = false
    `, [userId])

    return parseInt(result.rows[0].count)
  } catch (error) {
    console.error('Error getting unread notification count:', error)
    throw error
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const result = await query(`
      DELETE FROM notifications 
      WHERE id = $1 
      RETURNING *
    `, [notificationId])

    return result.rows[0]
  } catch (error) {
    console.error('Error deleting notification:', error)
    throw error
  }
}

// Notification creation helpers for specific events

/**
 * Create a broadcast message notification
 */
export async function createBroadcastNotification(userId: string, message: string) {
  return createNotification({
    user_id: userId,
    title: 'Broadcast Message',
    message: message,
    type: 'broadcast',
    read: false
  })
}

/**
 * Create a shift assignment notification
 */
export async function createShiftAssignmentNotification(userId: string, shiftDetails: string, actionUrl?: string) {
  return createNotification({
    user_id: userId,
    title: 'New Shift Assigned',
    message: `You have been assigned a new shift: ${shiftDetails}`,
    type: 'shift_assigned',
    read: false,
    action_url: actionUrl
  })
}

/**
 * Create a shift reminder notification
 */
export async function createShiftReminderNotification(userId: string, shiftDetails: string, actionUrl?: string) {
  return createNotification({
    user_id: userId,
    title: 'Shift Reminder',
    message: `Your shift starts soon: ${shiftDetails}`,
    type: 'shift_reminder',
    read: false,
    action_url: actionUrl
  })
}

/**
 * Create a leave request status notification
 */
export async function createLeaveRequestStatusNotification(userId: string, status: 'approved' | 'denied', requestDetails: string) {
  const title = status === 'approved' ? 'Leave Request Approved' : 'Leave Request Denied'
  const message = `Your leave request has been ${status}: ${requestDetails}`
  
  return createNotification({
    user_id: userId,
    title,
    message,
    type: 'leave',
    read: false
  })
}

/**
 * Create a swap request notification
 */
export async function createSwapRequestNotification(userId: string, requesterName: string, shiftDetails: string, actionUrl?: string) {
  return createNotification({
    user_id: userId,
    title: 'Shift Swap Request',
    message: `${requesterName} has requested to swap shifts with you: ${shiftDetails}`,
    type: 'swap',
    read: false,
    action_url: actionUrl
  })
}

/**
 * Create a swap request status notification
 */
export async function createSwapRequestStatusNotification(userId: string, status: 'approved' | 'denied', requestDetails: string) {
  const title = status === 'approved' ? 'Swap Request Approved' : 'Swap Request Denied'
  const message = `Your swap request has been ${status}: ${requestDetails}`
  
  return createNotification({
    user_id: userId,
    title,
    message,
    type: 'swap',
    read: false
  })
}

/**
 * Create a time tracking notification
 */
export async function createTimeTrackingNotification(userId: string, message: string, type: 'warning' | 'info' = 'info') {
  return createNotification({
    user_id: userId,
    title: 'Time Tracking Update',
    message,
    type: 'time',
    read: false
  })
}

/**
 * Create a schedule change notification
 */
export async function createScheduleChangeNotification(userId: string, changeDetails: string, actionUrl?: string) {
  return createNotification({
    user_id: userId,
    title: 'Schedule Change',
    message: `Your schedule has been updated: ${changeDetails}`,
    type: 'schedule',
    read: false,
    action_url: actionUrl
  })
}

/**
 * Send broadcast message to multiple users/employees
 */
export async function sendBroadcastMessage(message: string, userIds: string[]) {
  const notifications = []
  
  for (const userId of userIds) {
    try {
      const notification = await createBroadcastNotification(userId, message)
      notifications.push(notification)
    } catch (error) {
      console.error(`Error creating broadcast notification for user/employee ${userId}:`, error)
    }
  }
  
  return notifications
}

/**
 * Send broadcast message to all active employees
 */
export async function sendBroadcastToAllEmployees(message: string) {
  try {
    // For now, use employee IDs as user IDs since we don't have a separate user system
    const result = await query('SELECT id FROM employees_new WHERE is_active = true')
    const employeeIds = result.rows.map(emp => emp.id)
    
    // Create notifications using employee IDs as user IDs
    const notifications = []
    
    for (const employeeId of employeeIds) {
      try {
        const notification = await createBroadcastNotification(employeeId, message)
        notifications.push(notification)
      } catch (error) {
        console.error(`Error creating broadcast notification for employee ${employeeId}:`, error)
      }
    }
    
    return notifications
  } catch (error) {
    console.error('Error sending broadcast to all employees:', error)
    throw error
  }
}
