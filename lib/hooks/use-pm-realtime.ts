"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

interface TeamReport {
  id: string
  team_id: string
  date_from: string
  date_to: string
  summary: string
  highlights: string[]
  concerns: string[]
  recommendations: string[]
  statistics: any
  status: 'pending' | 'reviewed' | 'approved' | 'rejected'
  pm_notes?: string
  pm_reviewed_at?: string
  created_at: string
  updated_at: string
  team_name: string
  team_lead_first_name: string
  team_lead_last_name: string
  team_lead_email: string
}

interface ManagedTeam {
  id: string
  name: string
  department: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

interface SummaryStats {
  total_reports: number
  pending_reports: number
  reviewed_reports: number
  approved_reports: number
  rejected_reports: number
}

interface PMRealtimeState {
  teamReports: TeamReport[]
  managedTeams: ManagedTeam[]
  notifications: Notification[]
  summary: SummaryStats | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastUpdate: string | null
}

export function usePMRealtime() {
  const [state, setState] = useState<PMRealtimeState>({
    teamReports: [],
    managedTeams: [],
    notifications: [],
    summary: null,
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
      const eventSource = new EventSource('/api/project-manager/realtime')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('🔄 PM SSE connected')
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null
        }))
        reconnectAttemptsRef.current = 0
      }

      eventSource.addEventListener('pm', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📊 PM SSE message:', data)
          
          if (data.type === 'initial') {
            setState(prev => ({
              ...prev,
              teamReports: data.data.teamReports || [],
              managedTeams: data.data.managedTeams || [],
              notifications: data.data.notifications || [],
              summary: data.data.summary || null,
              lastUpdate: new Date().toISOString()
            }))
          } else if (data.type === 'update') {
            setState(prev => ({
              ...prev,
              teamReports: data.data.teamReports || prev.teamReports,
              notifications: data.data.notifications || prev.notifications,
              summary: data.data.summary || prev.summary,
              lastUpdate: new Date().toISOString()
            }))
          }
        } catch (error) {
          console.error('Error parsing PM SSE message:', error)
        }
      })

      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('💓 PM heartbeat:', data.timestamp)
        } catch (error) {
          console.error('Error parsing heartbeat:', error)
        }
      })

      eventSource.addEventListener('error', (event) => {
        console.error('❌ PM SSE error:', event)
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
            console.log(`🔄 Attempting to reconnect PM SSE (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
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
      console.error('Error creating PM EventSource:', error)
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
        console.log('🔄 Auto-reconnecting PM SSE...')
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
