import { useState, useEffect, useCallback, useRef } from 'react'

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  totalShifts: number
  completedShifts: number
  weeklyHours: number
  avgHoursPerEmployee: number
  pendingSwapRequests: number
  pendingLeaveRequests: number
  currentAttendance: number
  attendanceRate: number
}

interface DashboardData {
  employees: any[]
  shifts: any[]
  swapRequests: any[]
  leaveRequests: any[]
  timestamp: string
}

interface DashboardEvents {
  stats: DashboardStats | null
  data: DashboardData | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastUpdate: string | null
}

export function useDashboardEvents(adminId: string) {
  const [state, setState] = useState<DashboardEvents>({
    stats: null,
    data: null,
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
      const eventSource = new EventSource(`/api/dashboard/events?adminId=${adminId}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('🔄 Dashboard SSE connected')
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null
        }))
        reconnectAttemptsRef.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📊 Dashboard SSE message:', data)
          
          setState(prev => ({
            ...prev,
            lastUpdate: new Date().toISOString()
          }))
        } catch (error) {
          console.error('Error parsing SSE message:', error)
        }
      }

      eventSource.addEventListener('dashboard', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📊 Dashboard update received:', data)
          
          if (data.type === 'initial') {
            setState(prev => ({
              ...prev,
              stats: data.data,
              lastUpdate: new Date().toISOString()
            }))
          } else if (data.type === 'update') {
            setState(prev => ({
              ...prev,
              data: data.data,
              lastUpdate: new Date().toISOString()
            }))
          }
        } catch (error) {
          console.error('Error parsing dashboard event:', error)
        }
      })

      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('💓 Dashboard heartbeat:', data.timestamp)
        } catch (error) {
          console.error('Error parsing heartbeat:', error)
        }
      })

      eventSource.addEventListener('error', (event) => {
        console.error('❌ Dashboard SSE error:', event)
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
            console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
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
      console.error('Error creating EventSource:', error)
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to create connection'
      }))
    }
  }, [adminId])

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
    if (adminId) {
      connect()
    }

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [adminId, connect, disconnect])

  // Auto-reconnect when connection is lost
  useEffect(() => {
    if (!state.isConnected && !state.isConnecting && !state.error && adminId && !eventSourceRef.current) {
      const timeout = setTimeout(() => {
        console.log('🔄 Auto-reconnecting...')
        connect()
      }, 5000)

      return () => clearTimeout(timeout)
    }
  }, [state.isConnected, state.isConnecting, state.error, adminId, connect])

  return {
    ...state,
    connect,
    disconnect,
    reconnect
  }
}
