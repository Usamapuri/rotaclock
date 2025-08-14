"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Clock, 
  Calendar, 
  Users, 
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Download,
  Filter,
  Search,
  BarChart3,
  TrendingUp,
  Coffee,
  Timer,
  CalendarDays,
  FileText,
  Activity,
  Eye,
  User,
  Building,
  Mail,
  Phone
} from 'lucide-react'
import { AuthService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  is_active: boolean
}

interface ShiftLog {
  id: string
  employee_id: string
  shift_assignment_id?: string
  clock_in_time: string
  clock_out_time?: string
  total_shift_hours?: number
  break_time_used?: number
  max_break_allowed?: number
  is_late: boolean
  is_no_show: boolean
  late_minutes?: number
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  employee?: Employee
}

interface BreakLog {
  id: string
  shift_log_id: string
  employee_id: string
  break_start_time: string
  break_end_time?: string
  break_duration?: number
  break_type: 'lunch' | 'rest' | 'other'
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

interface TimesheetSummary {
  totalEmployees: number
  totalShifts: number
  totalHours: number
  totalBreaks: number
  averageShiftLength: number
  onTimePercentage: number
  overtimeHours: number
  activeEmployees: number
}

export default function AdminTimesheet() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([])
  const [breakLogs, setBreakLogs] = useState<BreakLog[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<TimesheetSummary>({
    totalEmployees: 0,
    totalShifts: 0,
    totalHours: 0,
    totalBreaks: 0,
    averageShiftLength: 0,
    onTimePercentage: 0,
    overtimeHours: 0,
    activeEmployees: 0
  })
  const [viewMode, setViewMode] = useState<'overview' | 'employee' | 'summary'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const router = useRouter()

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'admin') {
      router.push('/admin/login')
    } else {
      setCurrentUser(user)
      loadTimesheetData()
    }
  }, [router, selectedMonth])

  const loadTimesheetData = async () => {
    try {
      setLoading(true)
      const startDate = getMonthStart(selectedMonth)
      const endDate = getMonthEnd(selectedMonth)

      // Load all employees
      const employeesResponse = await fetch('/api/employees')
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json()
        setEmployees(employeesData.data || [])
      }

      // Load all shift logs for the selected month
      const shiftLogsResponse = await fetch(`/api/shift-logs?start_date=${startDate}&end_date=${endDate}`)
      if (shiftLogsResponse.ok) {
        const shiftLogsData = await shiftLogsResponse.json()
        if (shiftLogsData.success) {
          setShiftLogs(shiftLogsData.data)
        }
      }

      // Load all break logs for the selected month
      const breakLogsResponse = await fetch(`/api/break-logs?start_date=${startDate}&end_date=${endDate}`)
      if (breakLogsResponse.ok) {
        const breakLogsData = await breakLogsResponse.json()
        if (breakLogsData.success) {
          setBreakLogs(breakLogsData.data)
        }
      }
    } catch (error) {
      console.error('Error loading timesheet data:', error)
      toast.error('Failed to load timesheet data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    calculateSummary()
  }, [shiftLogs, breakLogs, employees])

  const calculateSummary = () => {
    const totalEmployees = employees.length
    const totalShifts = shiftLogs.length
    const totalHours = shiftLogs.reduce((sum, shift) => {
      if (shift.total_shift_hours && typeof shift.total_shift_hours === 'number') {
        return sum + shift.total_shift_hours
      }
      return sum
    }, 0)
    
    const totalBreaks = breakLogs.length
    const averageShiftLength = totalShifts > 0 ? totalHours / totalShifts : 0
    
    const onTimeShifts = shiftLogs.filter(shift => !shift.is_late).length
    const onTimePercentage = totalShifts > 0 ? (onTimeShifts / totalShifts) * 100 : 0
    
    const overtimeHours = totalHours > (totalEmployees * 160) ? totalHours - (totalEmployees * 160) : 0 // Assuming 160 hours is standard monthly hours per employee
    
    const activeEmployees = employees.filter(emp => emp.is_active).length

    setSummary({
      totalEmployees,
      totalShifts,
      totalHours,
      totalBreaks,
      averageShiftLength,
      onTimePercentage,
      overtimeHours,
      activeEmployees
    })
  }

  const getMonthStart = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).toISOString().split('T')[0]
  }

  const getMonthEnd = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).toISOString().split('T')[0]
  }

  const handlePreviousMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    setSelectedMonth(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    setSelectedMonth(newDate)
  }

  const handleLogout = () => {
    AuthService.logout()
    router.push('/admin/login')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case 'completed':
        return <Badge variant="outline" className="border-blue-200 text-blue-700">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateShiftDuration = (shiftLog: ShiftLog) => {
    const startTime = new Date(shiftLog.clock_in_time)
    const endTime = shiftLog.clock_out_time ? new Date(shiftLog.clock_out_time) : new Date()
    const durationMs = endTime.getTime() - startTime.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getEmployeeById = (employeeId: string) => {
    return employees.find(emp => emp.id === employeeId)
  }

  const getBreaksForShift = (shiftLogId: string) => {
    return breakLogs.filter(breakLog => breakLog.shift_log_id === shiftLogId)
  }

  const getShiftsForEmployee = (employeeId: string) => {
    return shiftLogs.filter(shift => shift.employee_id === employeeId)
  }

  const getEmployeeSummary = (employeeId: string) => {
    const employeeShifts = getShiftsForEmployee(employeeId)
    const totalHours = employeeShifts.reduce((sum, shift) => {
      if (shift.total_shift_hours && typeof shift.total_shift_hours === 'number') {
        return sum + shift.total_shift_hours
      }
      return sum
    }, 0)
    const totalBreaks = breakLogs.filter(breakLog => breakLog.employee_id === employeeId).length
    const onTimeShifts = employeeShifts.filter(shift => !shift.is_late).length
    const onTimePercentage = employeeShifts.length > 0 ? (onTimeShifts / employeeShifts.length) * 100 : 0
    
    return {
      totalShifts: employeeShifts.length,
      totalHours,
      totalBreaks,
      onTimePercentage,
      averageShiftLength: employeeShifts.length > 0 ? totalHours / employeeShifts.length : 0
    }
  }

  const filteredEmployees = employees.filter(employee => {
    if (!searchTerm && departmentFilter === 'all' && statusFilter === 'all') return true
    
    const matchesSearch = !searchTerm || 
      employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && employee.is_active) ||
      (statusFilter === 'inactive' && !employee.is_active)
    
    return matchesSearch && matchesDepartment && matchesStatus
  })

  const filteredShiftLogs = shiftLogs.filter(shift => {
    if (selectedEmployee !== 'all' && shift.employee_id !== selectedEmployee) return false
    
    const employee = getEmployeeById(shift.employee_id)
    if (!employee) return false
    
    if (departmentFilter !== 'all' && employee.department !== departmentFilter) return false
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !employee.is_active) return false
      if (statusFilter === 'inactive' && employee.is_active) return false
    }
    
    return true
  })

  const exportTimesheet = () => {
    const csvContent = [
      ['Employee ID', 'Employee Name', 'Department', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Breaks', 'Status', 'Late Minutes'],
      ...filteredShiftLogs.map(shift => {
        const employee = getEmployeeById(shift.employee_id)
        return [
          employee?.employee_id || 'Unknown',
          employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
          employee?.department || 'Unknown',
          formatDate(shift.clock_in_time),
          formatTime(shift.clock_in_time),
                     shift.clock_out_time ? formatTime(shift.clock_out_time) : 'Ongoing',
           calculateShiftDuration(shift),
           getBreaksForShift(shift.id).length.toString(),
           shift.status,
           (Number(shift.late_minutes) || 0).toString()
        ]
      })
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-timesheet-${selectedMonth.toISOString().slice(0, 7)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Timesheet exported successfully!')
  }

  const departments = [...new Set(employees.map(emp => emp.department))]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin timesheet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard">
                <div className="flex items-center">
                  <ArrowLeft className="h-6 w-6 text-purple-600 mr-2" />
                  <span className="text-xl font-bold text-gray-900">Admin Timesheet</span>
                </div>
              </Link>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Users className="h-3 w-3 mr-1" />
                Employee Time Management
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Admin: {currentUser?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Navigation and Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Month
            </Button>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900">
                {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-sm text-gray-600">Employee timesheet overview</p>
            </div>
            <Button variant="outline" onClick={handleNextMonth}>
              Next Month
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={exportTimesheet}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Employees</p>
                  <p className="text-2xl font-bold">{summary.totalEmployees}</p>
                </div>
                <Users className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Active Employees</p>
                  <p className="text-2xl font-bold">{summary.activeEmployees}</p>
                </div>
                <User className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Shifts</p>
                  <p className="text-2xl font-bold">{summary.totalShifts}</p>
                </div>
                <Calendar className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Hours</p>
                  <p className="text-2xl font-bold">{summary.totalHours.toFixed(1)}h</p>
                </div>
                <Clock className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Breaks</p>
                  <p className="text-2xl font-bold">{summary.totalBreaks}</p>
                </div>
                <Coffee className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Avg Shift</p>
                  <p className="text-2xl font-bold">{summary.averageShiftLength.toFixed(1)}h</p>
                </div>
                <Timer className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">On Time</p>
                  <p className="text-2xl font-bold">{summary.onTimePercentage.toFixed(0)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Overtime</p>
                  <p className="text-2xl font-bold">{summary.overtimeHours.toFixed(1)}h</p>
                </div>
                <Activity className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search Employees</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="department">Department</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="employee">Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {filteredEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="employee" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Employee Details
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  All Employee Shifts
                </CardTitle>
                <CardDescription>
                  Complete overview of all employee time entries for the selected month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredShiftLogs.map((shift) => {
                    const employee = getEmployeeById(shift.employee_id)
                    if (!employee) return null
                    
                    return (
                      <div key={shift.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-purple-500" />
                              <span className="font-medium text-gray-900">
                                {employee.first_name} {employee.last_name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {employee.employee_id}
                              </Badge>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {employee.department}
                            </Badge>
                            {getStatusBadge(shift.status)}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Duration</div>
                            <div className="font-medium text-gray-900">{calculateShiftDuration(shift)}</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Date</div>
                            <div className="font-medium">{formatDate(shift.clock_in_time)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Clock In</div>
                            <div className="font-medium">{formatTime(shift.clock_in_time)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Clock Out</div>
                            <div className="font-medium">
                              {shift.clock_out_time ? formatTime(shift.clock_out_time) : 'Ongoing'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Breaks</div>
                            <div className="font-medium">{getBreaksForShift(shift.id).length}</div>
                          </div>
                                                     <div>
                             <div className="text-gray-500">Break Time</div>
                             <div className="font-medium">{(Number(shift.break_time_used) || 0).toFixed(1)}h</div>
                           </div>
                                                     <div>
                             <div className="text-gray-500">Late</div>
                             <div className="font-medium">{(Number(shift.late_minutes) || 0) > 0 ? `${Number(shift.late_minutes)}m` : 'On time'}</div>
                           </div>
                        </div>

                        {getBreaksForShift(shift.id).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-sm text-gray-500 mb-2">Break Details:</div>
                            <div className="space-y-1">
                              {getBreaksForShift(shift.id).map((breakLog) => (
                                <div key={breakLog.id} className="flex items-center justify-between text-xs bg-orange-50 rounded p-2">
                                  <div className="flex items-center space-x-2">
                                    <Coffee className="h-3 w-3 text-orange-500" />
                                    <span className="text-orange-900">
                                      {formatTime(breakLog.break_start_time)} - {breakLog.break_end_time ? formatTime(breakLog.break_end_time) : 'Ongoing'}
                                    </span>
                                  </div>
                                  <span className="text-orange-700">
                                                                         {breakLog.break_duration ? `${Number(breakLog.break_duration).toFixed(1)}h` : 'Active'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {filteredShiftLogs.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No time entries found for the selected filters.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employee" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEmployees.map((employee) => {
                const employeeSummary = getEmployeeSummary(employee.id)
                const employeeShifts = getShiftsForEmployee(employee.id)
                
                return (
                  <Card key={employee.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{employee.first_name} {employee.last_name}</CardTitle>
                          <CardDescription>{employee.position}</CardDescription>
                        </div>
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{employee.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span>{employee.department}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>ID: {employee.employee_id}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{employeeSummary.totalShifts}</div>
                          <div className="text-xs text-gray-500">Shifts</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{employeeSummary.totalHours.toFixed(1)}h</div>
                          <div className="text-xs text-gray-500">Hours</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{employeeSummary.totalBreaks}</div>
                          <div className="text-xs text-gray-500">Breaks</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-emerald-600">{employeeSummary.onTimePercentage.toFixed(0)}%</div>
                          <div className="text-xs text-gray-500">On Time</div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setSelectedEmployee(employee.id)
                          setViewMode('overview')
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Department Overview
                  </CardTitle>
                  <CardDescription>
                    Time tracking metrics by department
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {departments.map(dept => {
                    const deptEmployees = employees.filter(emp => emp.department === dept)
                    const deptShifts = shiftLogs.filter(shift => {
                      const employee = getEmployeeById(shift.employee_id)
                      return employee?.department === dept
                    })
                    const deptHours = deptShifts.reduce((sum, shift) => {
                      if (shift.total_shift_hours && typeof shift.total_shift_hours === 'number') {
                        return sum + shift.total_shift_hours
                      }
                      return sum
                    }, 0)
                    
                    return (
                      <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{dept}</div>
                          <div className="text-sm text-gray-500">{deptEmployees.length} employees</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{deptShifts.length} shifts</div>
                          <div className="text-sm text-gray-500">{deptHours.toFixed(1)}h</div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>
                    Overall attendance and efficiency indicators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">On-Time Rate</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${summary.onTimePercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{summary.onTimePercentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Hours per Employee</span>
                      <span className="text-sm font-medium text-blue-600">
                        {summary.totalEmployees > 0 ? (summary.totalHours / summary.totalEmployees).toFixed(1) : 0}h
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Overtime Hours</span>
                      <span className="text-sm font-medium text-red-600">{summary.overtimeHours.toFixed(1)}h</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Break Efficiency</span>
                      <span className="text-sm font-medium text-purple-600">
                        {summary.totalShifts > 0 ? (summary.totalBreaks / summary.totalShifts).toFixed(1) : 0} per shift
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
