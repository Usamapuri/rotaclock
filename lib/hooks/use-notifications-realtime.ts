"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  related_id?: string
}

interface NotificationsRealtimeState {
  notifications: Notification[]
  unreadCount: number
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastUpdate: string | null
}

export function useNotificationsRealtime() {
  const [state, setState] = useState<NotificationsRealtimeState>({
    notifications: [],
    unreadCount: 0,
    isConnected: false,
    isConnecting: false,
    error: null,
    lastUpdate: null
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (eventSourceRef.current || state.isConnecting) return

    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const eventSource = new EventSource('/api/notifications/realtime')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('🔄 Notifications SSE connected')
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null
        }))
        reconnectAttemptsRef.current = 0
      }

      eventSource.addEventListener('notifications', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📊 Notifications SSE message:', data)
          
          if (data.type === 'initial') {
            setState(prev => ({
              ...prev,
              notifications: data.data.notifications || [],
              unreadCount: data.data.unreadCount || 0,
              lastUpdate: new Date().toISOString()
            }))
          } else if (data.type === 'update') {
            setState(prev => ({
              ...prev,
              notifications: data.data.notifications || prev.notifications,
              unreadCount: data.data.unreadCount || prev.unreadCount,
              lastUpdate: new Date().toISOString()
            }))
          }
        } catch (error) {
          console.error('Error parsing Notifications SSE message:', error)
        }
      })

      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('💓 Notifications heartbeat:', data.timestamp)
        } catch (error) {
          console.error('Error parsing heartbeat:', error)
        }
      })

      eventSource.addEventListener('error', (event) => {
        console.error('❌ Notifications SSE error:', event)
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: 'Connection error'
        }))
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔄 Attempting to reconnect Notifications SSE (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
            disconnect()
            connect()
          }, delay)
        } else {
          setState(prev => ({
            ...prev,
            error: 'Failed to connect after multiple attempts'
          }))
        }
      })

    } catch (error) {
      console.error('Error creating Notifications EventSource:', error)
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to create connection'
      }))
    }
  }, [state.isConnecting])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false
    }))
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectAttemptsRef.current = 0
    connect()
  }, [disconnect, connect])

  // Connect on mount
  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Auto-reconnect when connection is lost
  useEffect(() => {
    if (!state.isConnected && !state.isConnecting && !state.error && !eventSourceRef.current) {
      const timeout = setTimeout(() => {
        console.log('🔄 Auto-reconnecting Notifications SSE...')
        connect()
      }, 5000)

      return () => clearTimeout(timeout)
    }
  }, [state.isConnected, state.isConnecting, state.error, connect])

  return {
    ...state,
    connect,
    disconnect,
    reconnect
  }
}
