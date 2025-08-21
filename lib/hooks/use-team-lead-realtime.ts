"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

interface TeamMember {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  is_active: boolean
  status: 'online' | 'offline' | 'break'
}

interface TeamRequest {
  id: string
  employee_id: string
  type: 'dock' | 'bonus'
  amount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  emp_id: string
}

interface MeetingNote {
  id: string
  employee_id: string
  clock_in_time: string
  clock_out_time: string
  total_calls_taken: number
  leads_generated: number
  shift_remarks: string
  performance_rating: number
  created_at: string
  first_name: string
  last_name: string
  emp_id: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

interface TeamLeadRealtimeState {
  teamMembers: TeamMember[]
  requests: TeamRequest[]
  meetingNotes: MeetingNote[]
  notifications: Notification[]
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastUpdate: string | null
}

export function useTeamLeadRealtime(teamId: string | null) {
  const [state, setState] = useState<TeamLeadRealtimeState>({
    teamMembers: [],
    requests: [],
    meetingNotes: [],
    notifications: [],
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
    if (!teamId || eventSourceRef.current || state.isConnecting) return

    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const eventSource = new EventSource(`/api/team-lead/realtime?teamId=${teamId}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('🔄 Team Lead SSE connected')
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null
        }))
        reconnectAttemptsRef.current = 0
      }

      eventSource.addEventListener('teamlead', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📊 Team Lead SSE message:', data)
          
          if (data.type === 'initial') {
            setState(prev => ({
              ...prev,
              teamMembers: data.data.teamMembers || [],
              requests: data.data.requests || [],
              meetingNotes: data.data.meetingNotes || [],
              notifications: data.data.notifications || [],
              lastUpdate: new Date().toISOString()
            }))
          } else if (data.type === 'update') {
            setState(prev => ({
              ...prev,
              teamMembers: data.data.teamMembers || prev.teamMembers,
              requests: data.data.requests || prev.requests,
              meetingNotes: data.data.meetingNotes || prev.meetingNotes,
              notifications: data.data.notifications || prev.notifications,
              lastUpdate: new Date().toISOString()
            }))
          }
        } catch (error) {
          console.error('Error parsing Team Lead SSE message:', error)
        }
      })

      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('💓 Team Lead heartbeat:', data.timestamp)
        } catch (error) {
          console.error('Error parsing heartbeat:', error)
        }
      })

      eventSource.addEventListener('error', (event) => {
        console.error('❌ Team Lead SSE error:', event)
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
            console.log(`🔄 Attempting to reconnect Team Lead SSE (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
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
      console.error('Error creating Team Lead EventSource:', error)
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to create connection'
      }))
    }
  }, [teamId, state.isConnecting])

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
    if (teamId) {
      connect()
    }

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [teamId, connect, disconnect])

  // Auto-reconnect when connection is lost
  useEffect(() => {
    if (!state.isConnected && !state.isConnecting && !state.error && teamId && !eventSourceRef.current) {
      const timeout = setTimeout(() => {
        console.log('🔄 Auto-reconnecting Team Lead SSE...')
        connect()
      }, 5000)

      return () => clearTimeout(timeout)
    }
  }, [state.isConnected, state.isConnecting, state.error, teamId, connect])

  return {
    ...state,
    connect,
    disconnect,
    reconnect
  }
}
