import { useState, useEffect, useCallback } from 'react'
import { supabase, Notification, ApiResponse } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (id: string) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
  deleteNotification: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/notifications')
      const result: ApiResponse<Notification[]> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch notifications')
      }

      if (result.data) {
        setNotifications(result.data)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      })

      const result: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark notification as read')
      }

      setNotifications(prev => prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return false
    }
  }, [toast])

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
      })

      const result: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark all notifications as read')
      }

      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })))
      toast({
        title: "Success",
        description: "All notifications marked as read",
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all notifications as read'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return false
    }
  }, [toast])

  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      })

      const result: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete notification')
      }

      setNotifications(prev => prev.filter(notification => notification.id !== id))
      toast({
        title: "Success",
        description: "Notification deleted",
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete notification'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return false
    }
  }, [toast])

  const refresh = useCallback(() => {
    return fetchNotifications()
  }, [fetchNotifications])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Real-time subscription for notifications
  useEffect(() => {
    const channel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          
          // Show toast for new notifications
          toast({
            title: newNotification.title,
            description: newNotification.message,
            action: newNotification.action_url ? {
              label: "View",
              onClick: () => window.location.href = newNotification.action_url!
            } : undefined
          })
        } else if (payload.eventType === 'UPDATE') {
          const updatedNotification = payload.new as Notification
          setNotifications(prev => prev.map(notification => 
            notification.id === updatedNotification.id ? updatedNotification : notification
          ))
        } else if (payload.eventType === 'DELETE') {
          setNotifications(prev => prev.filter(notification => notification.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [toast])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh
  }
} 