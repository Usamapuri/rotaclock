import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client for API routes
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

// =====================================================
// CORE DATABASE TYPES
// =====================================================

export interface Employee {
  id: string
  user_id?: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department?: string
  position?: string
  hire_date?: string
  manager_id?: string
  is_active: boolean
  hourly_rate?: number
  max_hours_per_week?: number
  created_at: string
  updated_at: string
  manager?: Employee
  direct_reports?: Employee[]
}

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
  created_by_employee?: Employee
}

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
  assigned_by_employee?: Employee
}

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
  employee?: Employee
  shift_assignment?: ShiftAssignment
}

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
  original_shift?: ShiftAssignment
  requested_shift?: ShiftAssignment
  approved_by_employee?: Employee
}

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
  approved_by_employee?: Employee
}

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

export interface CompanyHoliday {
  id: string
  name: string
  date: string
  type: 'holiday' | 'company-event' | 'maintenance'
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// =====================================================
// ONBOARDING TYPES
// =====================================================

export interface OnboardingTemplate {
  id: string
  name: string
  description?: string
  department: string
  position: string
  total_estimated_time: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
  created_by_employee?: Employee
  onboarding_steps?: OnboardingStep[]
}

export interface OnboardingStep {
  id: string
  template_id: string
  title: string
  description?: string
  category: "documentation" | "training" | "setup" | "orientation" | "compliance"
  required: boolean
  estimated_time: number
  step_order: number
  assigned_to?: string
  instructions?: string
  created_at: string
  updated_at: string
  template?: OnboardingTemplate
  step_dependencies?: StepDependency[]
  step_documents?: { onboarding_documents: OnboardingDocument }[]
}

export interface StepDependency {
  id: string
  step_id: string
  depends_on_step_id: string
  created_at: string
  depends_on_step?: OnboardingStep
}

export interface OnboardingDocument {
  id: string
  name: string
  type: "handbook" | "policy" | "form" | "training" | "certificate" | "contract"
  file_url?: string
  required: boolean
  uploaded_by?: string
  created_at: string
  updated_at: string
  uploaded_by_employee?: Employee
}

export interface OnboardingProcess {
  id: string
  employee_id?: string
  employee_name: string
  template_id?: string
  template_name: string
  start_date: string
  expected_completion_date: string
  actual_completion_date?: string
  status: "not-started" | "in-progress" | "completed" | "overdue" | "paused"
  assigned_mentor?: string
  notes?: string
  progress: number
  created_at: string
  updated_at: string
  employee?: Employee
  template?: OnboardingTemplate
  assigned_mentor_employee?: Employee
  step_completions?: StepCompletion[]
}

export interface StepCompletion {
  id: string
  process_id: string
  step_id: string
  completed_at: string
  feedback?: string
  completed_by?: string
  created_at: string
  process?: OnboardingProcess
  step?: OnboardingStep
  completed_by_employee?: Employee
}

export interface OnboardingFeedback {
  id: string
  process_id: string
  step_id?: string
  rating?: number
  feedback_text?: string
  feedback_type: "step" | "overall" | "mentor"
  submitted_by?: string
  created_at: string
  process?: OnboardingProcess
  step?: OnboardingStep
  submitted_by_employee?: Employee
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get the current authenticated user's employee record
 */
export async function getCurrentEmployee() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return employee
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin() {
  const employee = await getCurrentEmployee()
  return employee?.position?.toLowerCase().includes('admin') || false
}

/**
 * Check if the current user is a manager
 */
export async function isManager() {
  const employee = await getCurrentEmployee()
  return employee?.position?.toLowerCase().includes('manager') || 
         employee?.position?.toLowerCase().includes('lead') || false
}

/**
 * Get employee by ID with related data
 */
export async function getEmployee(id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      manager:employees!manager_id(*),
      direct_reports:employees!manager_id(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Get all employees with optional filters
 */
export async function getEmployees(filters?: {
  department?: string
  is_active?: boolean
  position?: string
}) {
  let query = supabase
    .from('employees')
    .select(`
      *,
      manager:employees!manager_id(*)
    `)
    .order('first_name')

  if (filters?.department) {
    query = query.eq('department', filters.department)
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }
  if (filters?.position) {
    query = query.eq('position', filters.position)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Get shifts with optional filters
 */
export async function getShifts(filters?: {
  department?: string
  is_active?: boolean
}) {
  let query = supabase
    .from('shifts')
    .select('*')
    .order('name')

  if (filters?.department) {
    query = query.eq('department', filters.department)
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Get shift assignments for a specific date range
 */
export async function getShiftAssignments(filters: {
  start_date: string
  end_date: string
  employee_id?: string
  status?: string
}) {
  let query = supabase
    .from('shift_assignments')
    .select(`
      *,
      employee:employees(*),
      shift:shifts(*),
      assigned_by_employee:employees!assigned_by(*)
    `)
    .gte('date', filters.start_date)
    .lte('date', filters.end_date)
    .order('date')

  if (filters.employee_id) {
    query = query.eq('employee_id', filters.employee_id)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Get time entries for an employee
 */
export async function getTimeEntries(filters: {
  employee_id?: string
  start_date?: string
  end_date?: string
  status?: string
}) {
  let query = supabase
    .from('time_entries')
    .select(`
      *,
      employee:employees(*),
      shift_assignment:shift_assignments(*)
    `)
    .order('created_at', { ascending: false })

  if (filters.employee_id) {
    query = query.eq('employee_id', filters.employee_id)
  }
  if (filters.start_date) {
    query = query.gte('clock_in', filters.start_date)
  }
  if (filters.end_date) {
    query = query.lte('clock_in', filters.end_date)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Check if an employee is currently clocked in
 */
export async function isEmployeeClockedIn(employeeId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('id')
    .eq('employee_id', employeeId)
    .is('clock_out', null)
    .eq('status', 'in-progress')
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return !!data
}

/**
 * Get current time entry for an employee
 */
export async function getCurrentTimeEntry(employeeId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      employee:employees(*),
      shift_assignment:shift_assignments(*)
    `)
    .eq('employee_id', employeeId)
    .is('clock_out', null)
    .eq('status', 'in-progress')
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(limit = 50) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) throw error
}

/**
 * Create a new notification
 */
export async function createNotification(notification: Omit<Notification, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get leave requests with filters
 */
export async function getLeaveRequests(filters?: {
  employee_id?: string
  status?: string
  type?: string
  start_date?: string
  end_date?: string
}) {
  let query = supabase
    .from('leave_requests')
    .select(`
      *,
      employee:employees(*),
      approved_by_employee:employees!approved_by(*)
    `)
    .order('created_at', { ascending: false })

  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.type) {
    query = query.eq('type', filters.type)
  }
  if (filters?.start_date) {
    query = query.gte('start_date', filters.start_date)
  }
  if (filters?.end_date) {
    query = query.lte('end_date', filters.end_date)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Get shift swap requests
 */
export async function getShiftSwaps(filters?: {
  requester_id?: string
  target_id?: string
  status?: string
}) {
  let query = supabase
    .from('shift_swaps')
    .select(`
      *,
      requester:employees!requester_id(*),
      target:employees!target_id(*),
      original_shift:shift_assignments!original_shift_id(*),
      requested_shift:shift_assignments!requested_shift_id(*),
      approved_by_employee:employees!approved_by(*)
    `)
    .order('created_at', { ascending: false })

  if (filters?.requester_id) {
    query = query.eq('requester_id', filters.requester_id)
  }
  if (filters?.target_id) {
    query = query.eq('target_id', filters.target_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Get company holidays
 */
export async function getCompanyHolidays(filters?: {
  start_date?: string
  end_date?: string
  is_active?: boolean
}) {
  let query = supabase
    .from('company_holidays')
    .select('*')
    .order('date')

  if (filters?.start_date) {
    query = query.gte('date', filters.start_date)
  }
  if (filters?.end_date) {
    query = query.lte('date', filters.end_date)
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// =====================================================
// REAL-TIME SUBSCRIPTIONS
// =====================================================

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(callback: (payload: any) => void) {
  return supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications'
    }, callback)
    .subscribe()
}

/**
 * Subscribe to real-time shift assignments
 */
export function subscribeToShiftAssignments(callback: (payload: any) => void) {
  return supabase
    .channel('shift_assignments')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'shift_assignments'
    }, callback)
    .subscribe()
}

/**
 * Subscribe to real-time time entries
 */
export function subscribeToTimeEntries(callback: (payload: any) => void) {
  return supabase
    .channel('time_entries')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'time_entries'
    }, callback)
    .subscribe()
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format time for display
 */
export function formatTime(time: string) {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format date for display
 */
export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Calculate hours between two times
 */
export function calculateHours(startTime: string, endTime: string): number {
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)
  const diffMs = end.getTime() - start.getTime()
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
}

/**
 * Get status color for badges
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
    case 'confirmed':
    case 'completed':
      return 'default'
    case 'denied':
    case 'cancelled':
      return 'destructive'
    case 'pending':
    case 'assigned':
    case 'in-progress':
      return 'secondary'
    case 'overdue':
      return 'destructive'
    default:
      return 'outline'
  }
}
