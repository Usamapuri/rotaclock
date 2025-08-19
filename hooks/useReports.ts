import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export interface TimeReport {
  employee_id: string
  employee_name: string
  total_hours: number
  total_breaks: number
  total_entries: number
  average_hours_per_day: number
  date_range: {
    start: string
    end: string
  }
}

export interface ShiftReport {
  employee_id: string
  employee_name: string
  total_shifts: number
  completed_shifts: number
  cancelled_shifts: number
  total_hours: number
  average_shift_duration: number
  date_range: {
    start: string
    end: string
  }
}

export interface AttendanceReport {
  date: string
  total_employees: number
  present_employees: number
  absent_employees: number
  late_employees: number
  attendance_rate: number
}

export interface DepartmentReport {
  department: string
  total_employees: number
  total_hours: number
  average_hours_per_employee: number
  total_shifts: number
  completed_shifts: number
}

export interface ReportFilters {
  start_date: string
  end_date: string
  employee_id?: string
  department?: string
  include_breaks?: boolean
}

export function useReports() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getTimeReport = useCallback(async (filters: ReportFilters): Promise<TimeReport[]> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('start_date', filters.start_date)
      params.append('end_date', filters.end_date)
      if (filters.employee_id) params.append('employee_id', filters.employee_id)
      if (filters.department) params.append('department', filters.department)
      if (filters.include_breaks !== undefined) params.append('include_breaks', filters.include_breaks.toString())

      const response = await fetch(`/api/reports/time?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch time report')
      }

      const data = await response.json()
      return data.reports
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch time report'
      setError(errorMessage)
      toast.error(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getShiftReport = useCallback(async (filters: ReportFilters): Promise<ShiftReport[]> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('start_date', filters.start_date)
      params.append('end_date', filters.end_date)
      if (filters.employee_id) params.append('employee_id', filters.employee_id)
      if (filters.department) params.append('department', filters.department)

      const response = await fetch(`/api/reports/shifts?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch shift report')
      }

      const data = await response.json()
      return data.reports
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch shift report'
      setError(errorMessage)
      toast.error(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getAttendanceReport = useCallback(async (filters: ReportFilters): Promise<AttendanceReport[]> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('start_date', filters.start_date)
      params.append('end_date', filters.end_date)
      if (filters.department) params.append('department', filters.department)

      const response = await fetch(`/api/reports/attendance?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch attendance report')
      }

      const data = await response.json()
      return data.reports
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch attendance report'
      setError(errorMessage)
      toast.error(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getDepartmentReport = useCallback(async (filters: ReportFilters): Promise<DepartmentReport[]> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('start_date', filters.start_date)
      params.append('end_date', filters.end_date)

      const response = await fetch(`/api/reports/departments?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch department report')
      }

      const data = await response.json()
      return data.reports
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch department report'
      setError(errorMessage)
      toast.error(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const exportReport = useCallback(async (reportType: string, filters: ReportFilters, format: 'csv' | 'pdf' = 'csv') => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('start_date', filters.start_date)
      params.append('end_date', filters.end_date)
      if (filters.employee_id) params.append('employee_id', filters.employee_id)
      if (filters.department) params.append('department', filters.department)
      if (filters.include_breaks !== undefined) params.append('include_breaks', filters.include_breaks.toString())
      params.append('format', format)

      const response = await fetch(`/api/reports/${reportType}/export?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}_report_${filters.start_date}_${filters.end_date}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Report exported successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export report'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const getDashboardStats = useCallback(async (): Promise<any> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reports/dashboard-stats')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch dashboard stats')
      }

      const data = await response.json()
      return data.stats
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard stats'
      setError(errorMessage)
      toast.error(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getTimeReport,
    getShiftReport,
    getAttendanceReport,
    getDepartmentReport,
    exportReport,
    getDashboardStats
  }
} 