import { useState, useEffect, useCallback } from 'react'
import { supabase, Employee, ApiResponse, PaginatedResponse } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface UseEmployeesOptions {
  department?: string
  is_active?: boolean
  position?: string
  page?: number
  limit?: number
}

interface UseEmployeesReturn {
  employees: Employee[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  refresh: () => Promise<void>
  createEmployee: (data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => Promise<Employee | null>
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<Employee | null>
  deleteEmployee: (id: string) => Promise<boolean>
  getEmployee: (id: string) => Promise<Employee | null>
}

export function useEmployees(options: UseEmployeesOptions = {}): UseEmployeesReturn {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: options.page || 1,
    limit: options.limit || 50,
    total: 0,
    totalPages: 0
  })

  const { toast } = useToast()

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.department) params.append('department', options.department)
      if (options.is_active !== undefined) params.append('is_active', options.is_active.toString())
      if (options.position) params.append('position', options.position)
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())

      const response = await fetch(`/api/employees?${params}`)
      const result: ApiResponse<PaginatedResponse<Employee>> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch employees')
      }

      if (result.data) {
        setEmployees(result.data.data)
        setPagination(prev => ({
          ...prev,
          total: result.data!.total,
          totalPages: result.data!.totalPages
        }))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employees'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [options.department, options.is_active, options.position, pagination.page, pagination.limit, toast])

  const createEmployee = useCallback(async (data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee | null> => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result: ApiResponse<Employee> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create employee')
      }

      if (result.data) {
        setEmployees(prev => [result.data!, ...prev])
        toast({
          title: "Success",
          description: "Employee created successfully",
        })
        return result.data
      }

      return null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create employee'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return null
    }
  }, [toast])

  const updateEmployee = useCallback(async (id: string, data: Partial<Employee>): Promise<Employee | null> => {
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result: ApiResponse<Employee> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update employee')
      }

      if (result.data) {
        setEmployees(prev => prev.map(emp => emp.id === id ? result.data! : emp))
        toast({
          title: "Success",
          description: "Employee updated successfully",
        })
        return result.data
      }

      return null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update employee'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return null
    }
  }, [toast])

  const deleteEmployee = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      })

      const result: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete employee')
      }

      setEmployees(prev => prev.filter(emp => emp.id !== id))
      toast({
        title: "Success",
        description: "Employee deactivated successfully",
      })
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete employee'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return false
    }
  }, [toast])

  const getEmployee = useCallback(async (id: string): Promise<Employee | null> => {
    try {
      const response = await fetch(`/api/employees/${id}`)
      const result: ApiResponse<Employee> = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch employee')
      }

      return result.data || null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employee'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return null
    }
  }, [toast])

  const refresh = useCallback(() => {
    return fetchEmployees()
  }, [fetchEmployees])

  // Initial fetch
  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  // Real-time subscription for employee updates
  useEffect(() => {
    const channel = supabase
      .channel('employees_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'employees'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEmployees(prev => [payload.new as Employee, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setEmployees(prev => prev.map(emp => 
            emp.id === payload.new.id ? payload.new as Employee : emp
          ))
        } else if (payload.eventType === 'DELETE') {
          setEmployees(prev => prev.filter(emp => emp.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    employees,
    loading,
    error,
    pagination,
    refresh,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployee
  }
} 