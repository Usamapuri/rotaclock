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

interface DashboardPolling {
  stats: DashboardStats | null
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  lastUpdate: string | null
  isPolling: boolean
}

// Global request deduplication
const activeRequests = new Map<string, Promise<any>>()
const lastDataHash = new Map<string, string>()

export function useDashboardPolling(adminId: string, pollInterval: number = 15000) {
  const [state, setState] = useState<DashboardPolling>({
    stats: null,
    data: null,
    isLoading: false,
    error: null,
    lastUpdate: null,
    isPolling: false
  })

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const isActiveRef = useRef(true)
  const consecutiveErrorsRef = useRef(0)

  // Adaptive polling based on activity and errors
  const getAdaptiveInterval = useCallback(() => {
    if (consecutiveErrorsRef.current > 3) {
      return Math.min(pollInterval * 4, 60000) // Max 1 minute on errors
    }
    if (!isActiveRef.current) {
      return Math.min(pollInterval * 2, 30000) // Slower when inactive
    }
    return pollInterval
  }, [pollInterval])

  const fetchDashboardData = useCallback(async () => {
    if (!adminId) return

    const requestKey = `dashboard-${adminId}`
    
    // Deduplicate requests
    if (activeRequests.has(requestKey)) {
      return activeRequests.get(requestKey)
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    const requestPromise = (async () => {
      try {
        const response = await fetch('/api/dashboard/data', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'authorization': `Bearer ${adminId}`,
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        // Check if data actually changed
        const dataHash = JSON.stringify(data)
        const previousHash = lastDataHash.get(requestKey)
        
        if (dataHash === previousHash) {
          // Data hasn't changed, don't update state
          if (isMountedRef.current) {
            setState(prev => ({ ...prev, isLoading: false }))
          }
          return
        }
        
        lastDataHash.set(requestKey, dataHash)
        
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            stats: data.stats,
            data: data.data,
            isLoading: false,
            lastUpdate: new Date().toISOString()
          }))
          consecutiveErrorsRef.current = 0 // Reset error count on success
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        consecutiveErrorsRef.current++
        
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch data'
          }))
        }
      } finally {
        activeRequests.delete(requestKey)
      }
    })()

    activeRequests.set(requestKey, requestPromise)
    return requestPromise
  }, [adminId])

  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    // Initial fetch
    fetchDashboardData()

    // Set up adaptive polling
    const poll = () => {
      if (isMountedRef.current && isActiveRef.current) {
        fetchDashboardData()
      }
    }

    const interval = getAdaptiveInterval()
    pollingRef.current = setInterval(poll, interval)

    setState(prev => ({ ...prev, isPolling: true }))
  }, [fetchDashboardData, getAdaptiveInterval])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setState(prev => ({ ...prev, isPolling: false }))
  }, [])

  const refresh = useCallback(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Handle visibility changes for better resource management
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden
      
      if (document.hidden) {
        // Slow down polling when tab is not visible
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = setInterval(() => {
            if (isMountedRef.current) {
              fetchDashboardData()
            }
          }, 30000) // 30 seconds when not visible
        }
      } else {
        // Resume normal polling when tab becomes visible
        startPolling()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [startPolling, fetchDashboardData])

  // Start polling on mount
  useEffect(() => {
    if (adminId) {
      startPolling()
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [adminId, startPolling])

  return {
    ...state,
    startPolling,
    stopPolling,
    refresh
  }
}
