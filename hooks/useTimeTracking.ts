import { useState, useEffect, useCallback } from 'react'
import { supabase, TimeEntry, ApiResponse } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface UseTimeTrackingReturn {
  currentTimeEntry: TimeEntry | null
  timeEntries: TimeEntry[]
  loading: boolean
  error: string | null
  isClockedIn: boolean
  isOnBreak: boolean
  clockIn: (data?: { notes?: string; location_lat?: number; location_lng?: number }) => Promise<boolean>
  clockOut: (data?: { notes?: string; location_lat?: number; location_lng?: number }) => Promise<boolean>
  startBreak: (notes?: string) => Promise<boolean>
  endBreak: (notes?: string) => Promise<boolean>
  refresh: () => Promise<void>
  getTimeEntries: (filters?: {
    start_date?: string
    end_date?: string
    status?: string
  }) => Promise<TimeEntry[]>
}

export function useTimeTracking(): UseTimeTrackingReturn {
  const [currentTimeEntry, setCurrentTimeEntry] = useState<TimeEntry | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()

  const isClockedIn = currentTimeEntry?.status === 'in-progress' && !currentTimeEntry.clock_out
  const isOnBreak = currentTimeEntry?.status === 'break'

  const fetchCurrentTimeEntry = useCallback(async () => {
    try {
      const response = await fetch('/api/time/entries?status=in-progress&limit=1')
      const result: ApiResponse<{ data: TimeEntry[] }> = await response.json()

      if (response.ok && result.data?.data.length > 0) {
        setCurrentTimeEntry(result.data.data[0])
      } else {
        setCurrentTimeEntry(null)
      }
    } catch (err) {
      console.error('Error fetching current time entry:', err)
    }
  }, [])

  const fetchTimeEntries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/time/entries')
      const result: ApiResponse<{ data: TimeEntry[] }> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch time entries')
      }

      if (result.data) {
        setTimeEntries(result.data.data)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch time entries'
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

  const clockIn = useCallback(async (data?: { notes?: string; location_lat?: number; location_lng?: number }): Promise<boolean> => {
    try {
      const response = await fetch('/api/time/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data || {}),
      })

      const result: ApiResponse<TimeEntry> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clock in')
      }

      if (result.data) {
        setCurrentTimeEntry(result.data)
        setTimeEntries(prev => [result.data!, ...prev])
        toast({
          title: "Success",
          description: "Successfully clocked in",
        })
        return true
      }

      return false
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clock in'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return false
    }
  }, [toast])

  const clockOut = useCallback(async (data?: { notes?: string; location_lat?: number; location_lng?: number }): Promise<boolean> => {
    try {
      const response = await fetch('/api/time/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data || {}),
      })

      const result: ApiResponse<TimeEntry> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clock out')
      }

      if (result.data) {
        setCurrentTimeEntry(null)
        setTimeEntries(prev => prev.map(entry => 
          entry.id === result.data!.id ? result.data! : entry
        ))
        toast({
          title: "Success",
          description: `Successfully clocked out. Total hours: ${result.data.total_hours}`,
        })
        return true
      }

      return false
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clock out'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return false
    }
  }, [toast])

  const startBreak = useCallback(async (notes?: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/time/break-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      })

      const result: ApiResponse<TimeEntry> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start break')
      }

      if (result.data) {
        setCurrentTimeEntry(result.data)
        setTimeEntries(prev => prev.map(entry => 
          entry.id === result.data!.id ? result.data! : entry
        ))
        toast({
          title: "Success",
          description: "Break started successfully",
        })
        return true
      }

      return false
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start break'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return false
    }
  }, [toast])

  const endBreak = useCallback(async (notes?: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/time/break-end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      })

      const result: ApiResponse<TimeEntry> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to end break')
      }

      if (result.data) {
        setCurrentTimeEntry(result.data)
        setTimeEntries(prev => prev.map(entry => 
          entry.id === result.data!.id ? result.data! : entry
        ))
        toast({
          title: "Success",
          description: "Break ended successfully",
        })
        return true
      }

      return false
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end break'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return false
    }
  }, [toast])

  const getTimeEntries = useCallback(async (filters?: {
    start_date?: string
    end_date?: string
    status?: string
  }): Promise<TimeEntry[]> => {
    try {
      const params = new URLSearchParams()
      if (filters?.start_date) params.append('start_date', filters.start_date)
      if (filters?.end_date) params.append('end_date', filters.end_date)
      if (filters?.status) params.append('status', filters.status)

      const response = await fetch(`/api/time/entries?${params}`)
      const result: ApiResponse<{ data: TimeEntry[] }> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch time entries')
      }

      return result.data?.data || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch time entries'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return []
    }
  }, [toast])

  const refresh = useCallback(async () => {
    await Promise.all([fetchCurrentTimeEntry(), fetchTimeEntries()])
  }, [fetchCurrentTimeEntry, fetchTimeEntries])

  // Initial fetch
  useEffect(() => {
    refresh()
  }, [refresh])

  // Real-time subscription for time entry updates
  useEffect(() => {
    const channel = supabase
      .channel('time_entries_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'time_entries'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newEntry = payload.new as TimeEntry
          if (newEntry.status === 'in-progress' && !newEntry.clock_out) {
            setCurrentTimeEntry(newEntry)
          }
          setTimeEntries(prev => [newEntry, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          const updatedEntry = payload.new as TimeEntry
          if (updatedEntry.status === 'completed' || updatedEntry.clock_out) {
            setCurrentTimeEntry(null)
          } else {
            setCurrentTimeEntry(updatedEntry)
          }
          setTimeEntries(prev => prev.map(entry => 
            entry.id === updatedEntry.id ? updatedEntry : entry
          ))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    currentTimeEntry,
    timeEntries,
    loading,
    error,
    isClockedIn,
    isOnBreak,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    refresh,
    getTimeEntries
  }
} 