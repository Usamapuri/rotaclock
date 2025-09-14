// API Service Layer for RotaClock
// This file contains all API functions to interact with the backend

import { AuthService } from './auth'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  success?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Employee Types
export interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department?: string
  job_position?: string
  hire_date?: string
  manager_id?: string
  is_active: boolean
  hourly_rate?: number
  max_hours_per_week?: number
  created_at: string
  updated_at: string
}

export interface CreateEmployeeRequest {
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department?: string
  position?: string
  hire_date?: string
  manager_id?: string
  hourly_rate?: number
  max_hours_per_week?: number
  is_active?: boolean
  password?: string
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
  id: string
}

// Shift Types
export interface Shift {
  id: string
  name: string
  description?: string
  start_time: string
  end_time: string
  department?: string
  required_staff: number
  hourly_rate?: number
  color: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CreateShiftRequest {
  name: string
  description?: string
  start_time: string
  end_time: string
  department?: string
  required_staff: number
  hourly_rate?: number
  color: string
  is_active?: boolean
  created_by?: string
}

export interface UpdateShiftRequest extends Partial<CreateShiftRequest> {
  id: string
}

// Shift Assignment Types
export interface ShiftAssignment {
  id: string
  employee_id: string
  shift_id: string
  date: string
  start_time?: string
  end_time?: string
  status: 'assigned' | 'confirmed' | 'completed' | 'cancelled' | 'swap-requested'
  assigned_by?: string
  notes?: string
  created_at: string
  updated_at: string
  employee?: Employee
  shift?: Shift
}

export interface CreateShiftAssignmentRequest {
  employee_id: string
  shift_id: string
  date: string
  start_time?: string
  end_time?: string
  status?: string
  assigned_by?: string
  notes?: string
}

// Time Entry Types
export interface TimeEntry {
  id: string
  employee_id: string
  shift_assignment_id?: string
  clock_in?: string
  clock_out?: string
  break_start?: string
  break_end?: string
  total_hours?: number
  status: 'in-progress' | 'completed' | 'break' | 'overtime'
  notes?: string
  location_lat?: number
  location_lng?: number
  created_at: string
  updated_at: string
}

export interface CreateTimeEntryRequest {
  employee_id: string
  shift_assignment_id?: string
  clock_in?: string
  status?: string
  notes?: string
  location_lat?: number
  location_lng?: number
}

// Leave Request Types
export interface LeaveRequest {
  id: string
  employee_id: string
  type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'jury-duty' | 'other'
  start_date: string
  end_date: string
  days_requested: number
  reason?: string
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  approved_by?: string
  approved_at?: string
  admin_notes?: string
  created_at: string
  updated_at: string
  employee?: Employee
}

export interface CreateLeaveRequestRequest {
  employee_id: string
  type: string
  start_date: string
  end_date: string
  days_requested: number
  reason?: string
}

// Shift Swap Types
export interface ShiftSwap {
  id: string
  requester_id: string
  target_id: string
  original_shift_id: string
  requested_shift_id: string
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  reason?: string
  admin_notes?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
  requester?: Employee
  target?: Employee
}

export interface CreateShiftSwapRequest {
  requester_id: string
  target_id: string
  original_shift_id: string
  requested_shift_id: string
  reason?: string
}

// Notification Types
export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'schedule' | 'time' | 'leave' | 'swap'
  read: boolean
  action_url?: string
  created_at: string
}

// Report Types
export interface AttendanceStats {
  id: string
  first_name: string
  last_name: string
  department: string
  position: string
  total_entries: number
  completed_entries: number
  total_hours: number
  avg_hours_per_day: number
  late_clock_ins: number
}

export interface PayrollStats {
  id: string
  first_name: string
  last_name: string
  department: string
  hourly_rate: number
  total_hours: number
  overtime_pay: number
  regular_pay: number
  total_pay: number
}

export interface DepartmentStats {
  department: string
  employee_count: number
  total_hours: number
  avg_hours_per_employee: number
  total_payroll: number
}

// API Service Class
class ApiService {
  private baseUrl = '/api'

  // Generic GET method
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint)
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, any> = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      }

      // Attach Authorization header from current user if not already present
      if (!headers['authorization']) {
        try {
          const user = AuthService.getCurrentUser()
          if (user?.id) {
            headers['authorization'] = `Bearer ${user.id}`
          }
        } catch (_) {
          // ignore
        }
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers,
        ...options,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          ...data,
          success: false,
          error: data.error || `HTTP ${response.status}`
        }
      }

      return {
        ...data,
        success: true
      }
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Employee API Methods
  async getEmployees(filters?: {
    department?: string
    is_active?: boolean
    job_position?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<Employee[]>> {
    const params = new URLSearchParams()
    if (filters?.department) params.append('department', filters.department)
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
    if (filters?.job_position) params.append('job_position', filters.job_position)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    return this.request<Employee[]>(`/admin/employees?${params.toString()}`)
  }

  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    return this.request<Employee>(`/admin/employees/${id}`)
  }

  async createEmployee(data: CreateEmployeeRequest): Promise<ApiResponse<Employee>> {
    return this.request<Employee>('/admin/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateEmployee(data: UpdateEmployeeRequest): Promise<ApiResponse<Employee>> {
    return this.request<Employee>('/admin/employees', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteEmployee(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/employees?id=${id}`, {
      method: 'DELETE',
    })
  }

  // Shift API Methods
  async getShifts(filters?: {
    department?: string
    is_active?: boolean
  }): Promise<ApiResponse<Shift[]>> {
    const params = new URLSearchParams()
    if (filters?.department) params.append('department', filters.department)
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())

    return this.request<Shift[]>(`/shifts?${params.toString()}`)
  }

  async getShift(id: string): Promise<ApiResponse<Shift>> {
    return this.request<Shift>(`/shifts/${id}`)
  }

  async createShift(data: CreateShiftRequest): Promise<ApiResponse<Shift>> {
    return this.request<Shift>('/shifts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateShift(data: UpdateShiftRequest): Promise<ApiResponse<Shift>> {
    return this.request<Shift>('/shifts', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateShiftById(id: string, data: Partial<CreateShiftRequest>): Promise<ApiResponse<Shift>> {
    return this.request<Shift>(`/shifts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteShift(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/shifts?id=${id}`, {
      method: 'DELETE',
    })
  }

  // Shift Assignment API Methods
  async getShiftAssignments(filters: {
    start_date: string
    end_date: string
    employee_id?: string
    status?: string
  }): Promise<ApiResponse<ShiftAssignment[]>> {
    const params = new URLSearchParams()
    params.append('start_date', filters.start_date)
    params.append('end_date', filters.end_date)
    if (filters.employee_id) params.append('employee_id', filters.employee_id)
    if (filters.status) params.append('status', filters.status)

    return this.request<ShiftAssignment[]>(`/shifts/assignments?${params.toString()}`)
  }

  async getEmployeeShifts(employeeId: string, filters?: {
    start_date?: string
    end_date?: string
    status?: string
  }): Promise<ApiResponse<ShiftAssignment[]>> {
    const params = new URLSearchParams()
    params.append('employee_id', employeeId)
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)
    if (filters?.status) params.append('status', filters.status)

    return this.request<ShiftAssignment[]>(`/shifts/assignments?${params.toString()}`)
  }

  async createShiftAssignment(data: CreateShiftAssignmentRequest): Promise<ApiResponse<ShiftAssignment>> {
    return this.request<ShiftAssignment>('/shifts/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateShiftAssignment(id: string, data: Partial<CreateShiftAssignmentRequest>): Promise<ApiResponse<ShiftAssignment>> {
    return this.request<ShiftAssignment>(`/shifts/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Time Entry API Methods
  async getTimeEntries(filters?: {
    employee_id?: string
    start_date?: string
    end_date?: string
    status?: string
  }): Promise<ApiResponse<TimeEntry[]>> {
    const params = new URLSearchParams()
    if (filters?.employee_id) params.append('employee_id', filters.employee_id)
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)
    if (filters?.status) params.append('status', filters.status)

    return this.request<TimeEntry[]>(`/time/entries?${params.toString()}`)
  }

  async clockIn(data: CreateTimeEntryRequest): Promise<ApiResponse<TimeEntry>> {
    return this.request<TimeEntry>('/time/clock-in', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async clockOut(employeeId: string): Promise<ApiResponse<TimeEntry>> {
    return this.request<TimeEntry>('/time/clock-out', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId }),
    })
  }

  async startBreak(employeeId: string): Promise<ApiResponse<TimeEntry>> {
    return this.request<TimeEntry>('/time/break-start', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId }),
    })
  }

  async endBreak(employeeId: string): Promise<ApiResponse<TimeEntry>> {
    return this.request<TimeEntry>('/time/break-end', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId }),
    })
  }

  // Leave Request API Methods
  async getLeaveRequests(filters?: {
    employee_id?: string
    status?: string
    type?: string
    start_date?: string
    end_date?: string
  }): Promise<ApiResponse<LeaveRequest[]>> {
    const params = new URLSearchParams()
    if (filters?.employee_id) params.append('employee_id', filters.employee_id)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)

    return this.request<LeaveRequest[]>(`/leave-requests?${params.toString()}`)
  }

  async createLeaveRequest(data: CreateLeaveRequestRequest): Promise<ApiResponse<LeaveRequest>> {
    return this.request<LeaveRequest>('/leave-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateLeaveRequest(id: string, data: Partial<CreateLeaveRequestRequest> & { status?: string }): Promise<ApiResponse<LeaveRequest>> {
    return this.request<LeaveRequest>(`/leave-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async approveLeaveRequest(id: string, adminNotes?: string): Promise<ApiResponse<LeaveRequest>> {
    return this.request<LeaveRequest>(`/leave-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'approved', admin_notes: adminNotes }),
    })
  }

  async rejectLeaveRequest(id: string, adminNotes?: string): Promise<ApiResponse<LeaveRequest>> {
    return this.request<LeaveRequest>(`/leave-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'denied', admin_notes: adminNotes }),
    })
  }

  // Shift Swap API Methods
  async getShiftSwaps(filters?: {
    requester_id?: string
    target_id?: string
    status?: string
  }): Promise<ApiResponse<ShiftSwap[]>> {
    const params = new URLSearchParams()
    if (filters?.requester_id) params.append('requester_id', filters.requester_id)
    if (filters?.target_id) params.append('target_id', filters.target_id)
    if (filters?.status) params.append('status', filters.status)

    return this.request<ShiftSwap[]>(`/shifts/swap-requests?${params.toString()}`)
  }

  async getSwapRequests(filters?: {
    requester_id?: string
    target_id?: string
    status?: string
  }): Promise<ApiResponse<ShiftSwap[]>> {
    return this.getShiftSwaps(filters)
  }

  async createShiftSwap(data: CreateShiftSwapRequest): Promise<ApiResponse<ShiftSwap>> {
    return this.request<ShiftSwap>('/shifts/swap-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async createSwapRequest(data: CreateShiftSwapRequest): Promise<ApiResponse<ShiftSwap>> {
    return this.createShiftSwap(data)
  }

  async updateShiftSwap(id: string, data: Partial<CreateShiftSwapRequest> & { status?: string }): Promise<ApiResponse<ShiftSwap>> {
    return this.request<ShiftSwap>(`/shifts/swap-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Notification API Methods
  async getNotifications(limit = 50): Promise<ApiResponse<Notification[]>> {
    return this.request<Notification[]>(`/notifications?limit=${limit}`)
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/notifications/${id}/read`, {
      method: 'PUT',
    })
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return this.request<void>('/notifications/mark-all-read', {
      method: 'PUT',
    })
  }

  // Report API Methods
  async getAttendanceStats(filters: {
    start_date: string
    end_date: string
    department?: string
  }): Promise<ApiResponse<AttendanceStats[]>> {
    const params = new URLSearchParams()
    params.append('start_date', filters.start_date)
    params.append('end_date', filters.end_date)
    if (filters.department) params.append('department', filters.department)

    return this.request<AttendanceStats[]>(`/reports/attendance?${params.toString()}`)
  }

  async getPayrollStats(filters: {
    start_date: string
    end_date: string
    department?: string
  }): Promise<ApiResponse<PayrollStats[]>> {
    const params = new URLSearchParams()
    params.append('start_date', filters.start_date)
    params.append('end_date', filters.end_date)
    if (filters.department) params.append('department', filters.department)

    return this.request<PayrollStats[]>(`/reports/payroll?${params.toString()}`)
  }

  async getDepartmentStats(filters: {
    start_date: string
    end_date: string
  }): Promise<ApiResponse<DepartmentStats[]>> {
    const params = new URLSearchParams()
    params.append('start_date', filters.start_date)
    params.append('end_date', filters.end_date)

    return this.request<DepartmentStats[]>(`/reports/departments?${params.toString()}`)
  }

  // Onboarding API Methods
  async getOnboardingTemplates(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/onboarding/templates')
  }

  async getOnboardingProcesses(filters?: {
    employee_id?: string
    status?: string
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams()
    if (filters?.employee_id) params.append('employee_id', filters.employee_id)
    if (filters?.status) params.append('status', filters.status)

    return this.request<any[]>(`/onboarding/processes?${params.toString()}`)
  }

  async createOnboardingProcess(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/onboarding/processes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async completeOnboardingStep(processId: string, stepId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/onboarding/steps/complete`, {
      method: 'POST',
      body: JSON.stringify({ process_id: processId, step_id: stepId }),
    })
  }
}

// Export singleton instance
export const apiService = new ApiService()
