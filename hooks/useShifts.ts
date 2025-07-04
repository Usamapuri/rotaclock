import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface Shift {
  id: string
  employee_id: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  notes?: string
  location?: string
  created_at: string
  updated_at: string
  employee?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface CreateShiftData {
  employee_id: string
  start_time: string
  end_time: string
  notes?: string
  location?: string
}

export interface UpdateShiftData {
  start_time?: string
  end_time?: string
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  notes?: string
  location?: string
}

export interface ShiftFilters {
  employee_id?: string
  status?: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

export function useShifts() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  const fetchShifts = useCallback(async (filters: ShiftFilters = {}) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (filters.employee_id) params.append('employee_id', filters.employee_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      const response = await fetch(`/api/shifts?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch shifts')
      }

      const data = await response.json()
      setShifts(data.shifts)
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch shifts'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const createShift = useCallback(async (shiftData: CreateShiftData): Promise<Shift | null> => {
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shiftData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create shift')
      }

      const data = await response.json()
      toast.success('Shift created successfully')
      return data.shift
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create shift'
      toast.error(errorMessage)
      return null
    }
  }, [])

  const updateShift = useCallback(async (id: string, shiftData: UpdateShiftData): Promise<Shift | null> => {
    try {
      const response = await fetch(`/api/shifts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shiftData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update shift')
      }

      const data = await response.json()
      toast.success('Shift updated successfully')
      return data.shift
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update shift'
      toast.error(errorMessage)
      return null
    }
  }, [])

  const deleteShift = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/shifts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete shift')
      }

      toast.success('Shift deleted successfully')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete shift'
      toast.error(errorMessage)
      return false
    }
  }, [])

  const getShift = useCallback(async (id: string): Promise<Shift | null> => {
    try {
      const response = await fetch(`/api/shifts/${id}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch shift')
      }

      const data = await response.json()
      return data.shift
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch shift'
      toast.error(errorMessage)
      return null
    }
  }, [])

  const startShift = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/shifts/${id}/start`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start shift')
      }

      toast.success('Shift started successfully')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start shift'
      toast.error(errorMessage)
      return false
    }
  }, [])

  const endShift = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/shifts/${id}/end`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to end shift')
      }

      toast.success('Shift ended successfully')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end shift'
      toast.error(errorMessage)
      return false
    }
  }, [])

  const refresh = useCallback(() => {
    fetchShifts({
      page: pagination.page,
      limit: pagination.limit
    })
  }, [fetchShifts, pagination.page, pagination.limit])

  // Initial fetch
  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('shifts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setShifts(prev => [payload.new as Shift, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setShifts(prev => 
              prev.map(shift => 
                shift.id === payload.new.id ? payload.new as Shift : shift
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setShifts(prev => prev.filter(shift => shift.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    shifts,
    loading,
    error,
    pagination,
    fetchShifts,
    createShift,
    updateShift,
    deleteShift,
    getShift,
    startShift,
    endShift,
    refresh
  }
} 