"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Clock, 
  Calendar, 
  User, 
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
  Play,
  Pause,
  Square,
  Timer,
  CalendarDays,
  FileText,
  PieChart,
  Activity
} from 'lucide-react'
import { AuthService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

interface ShiftLog {
  id: string
  employee_id: string
  shift_assignment_id?: string
  clock_in_time: string
  clock_out_time?: string
  total_shift_hours?: number
  break_time_used: number
  max_break_allowed: number
  is_late: boolean
  is_no_show: boolean
  late_minutes: number
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
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
  totalShifts: number
  totalHours: number
  totalBreaks: number
  averageShiftLength: number
  onTimePercentage: number
  overtimeHours: number
}

export default function Timesheet() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([])
  const [breakLogs, setBreakLogs] = useState<BreakLog[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<TimesheetSummary>({
    totalShifts: 0,
    totalHours: 0,
    totalBreaks: 0,
    averageShiftLength: 0,
    onTimePercentage: 0,
    overtimeHours: 0
  })
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'summary'>('calendar')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user) {
      router.push('/login')
    } else {
      setCurrentUser(user)
      loadTimesheetData()
    }
  }, [router, selectedMonth])

  const loadTimesheetData = async () => {
    try {
      setLoading(true)
      const user = AuthService.getCurrentUser()
      if (!user) return

      const startDate = getMonthStart(selectedMonth)
      const endDate = getMonthEnd(selectedMonth)

      // Load shift logs for the selected month
      const shiftLogsResponse = await fetch(`/api/time-entries?employee_id=${user.id}&start_date=${startDate}&end_date=${endDate}`)
      if (shiftLogsResponse.ok) {
        const shiftLogsData = await shiftLogsResponse.json()
        if (shiftLogsData.success) {
          setShiftLogs(shiftLogsData.data)
        }
      }

      // Load break logs for the selected month
      const breakLogsResponse = await fetch(`/api/time-entries?employee_id=${user.id}&start_date=${startDate}&end_date=${endDate}`)
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
  }, [shiftLogs, breakLogs])

  const calculateSummary = () => {
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
    
    const overtimeHours = totalHours > 160 ? totalHours - 160 : 0 // Assuming 160 hours is standard monthly hours

    setSummary({
      totalShifts,
      totalHours,
      totalBreaks,
      averageShiftLength,
      onTimePercentage,
      overtimeHours
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
    router.push('/login')
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

  const getShiftsForDate = (date: string) => {
    return shiftLogs.filter(log => {
      const logDate = new Date(log.clock_in_time).toISOString().split('T')[0]
      return logDate === date
    })
  }

  const getBreaksForShift = (shiftLogId: string) => {
    return breakLogs.filter(breakLog => breakLog.shift_log_id === shiftLogId)
  }

  const filteredShiftLogs = shiftLogs.filter(shift => {
    if (!searchTerm) return true
    const date = formatDate(shift.clock_in_time)
    const time = formatTime(shift.clock_in_time)
    const status = shift.status
    return date.toLowerCase().includes(searchTerm.toLowerCase()) ||
           time.toLowerCase().includes(searchTerm.toLowerCase()) ||
           status.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Generate calendar days for the selected month
  const generateCalendarDays = () => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= lastDay || currentDate.getDay() !== 0) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  const calendarDays = generateCalendarDays()

  const exportTimesheet = () => {
    const csvContent = [
      ['Date', 'Clock In', 'Clock Out', 'Duration', 'Breaks', 'Status'],
      ...shiftLogs.map(shift => [
        formatDate(shift.clock_in_time),
        formatTime(shift.clock_in_time),
        shift.clock_out_time ? formatTime(shift.clock_out_time) : 'Ongoing',
        calculateShiftDuration(shift),
        getBreaksForShift(shift.id).length.toString(),
        shift.status
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet-${selectedMonth.toISOString().slice(0, 7)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Timesheet exported successfully!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timesheet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/employee/dashboard">
                <div className="flex items-center">
                  <ArrowLeft className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="text-xl font-bold text-gray-900">Timesheet</span>
                </div>
              </Link>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <FileText className="h-3 w-3 mr-1" />
                Professional Time Tracking
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {currentUser?.email}</span>
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
              <p className="text-sm text-gray-600">Your professional timesheet</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
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

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Hours</p>
                  <p className="text-2xl font-bold">{(Number(summary.totalHours) || 0).toFixed(1)}h</p>
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

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Avg Shift</p>
                  <p className="text-2xl font-bold">{(Number(summary.averageShiftLength) || 0).toFixed(1)}h</p>
                </div>
                <Timer className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">On Time</p>
                  <p className="text-2xl font-bold">{(Number(summary.onTimePercentage) || 0).toFixed(0)}%</p>
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
                  <p className="text-2xl font-bold">{(Number(summary.overtimeHours) || 0).toFixed(1)}h</p>
                </div>
                <Activity className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar" className="flex items-center">
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              List View
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Monthly Calendar View
                </CardTitle>
                <CardDescription>
                  Visual overview of your work schedule and time tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-medium text-gray-700 py-2 bg-gray-50 rounded">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const dateString = day.toISOString().split('T')[0]
                    const dayShifts = getShiftsForDate(dateString)
                    const isCurrentMonth = day.getMonth() === selectedMonth.getMonth()
                    const isToday = day.toDateString() === new Date().toDateString()
                    
                    return (
                      <div 
                        key={index} 
                        className={`min-h-32 border rounded-lg p-2 transition-all duration-200 hover:shadow-md ${
                          isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                        } ${isToday ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-2 ${
                          isToday ? 'text-blue-600 font-bold' : 'text-gray-900'
                        }`}>
                          {day.getDate()}
                        </div>
                        
                        {dayShifts.length > 0 ? (
                          <div className="space-y-1">
                            {dayShifts.map((shift) => (
                              <div key={shift.id} className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded p-2">
                                <div className="font-medium text-blue-900">
                                  {formatTime(shift.clock_in_time)} - {shift.clock_out_time ? formatTime(shift.clock_out_time) : 'Ongoing'}
                                </div>
                                <div className="text-blue-700 text-xs">
                                  {calculateShiftDuration(shift)}
                                </div>
                                <div className="mt-1">
                                  {getStatusBadge(shift.status)}
                                </div>
                                
                                {/* Show breaks for this shift */}
                                {getBreaksForShift(shift.id).map((breakLog) => (
                                  <div key={breakLog.id} className="mt-1 text-xs bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded p-1">
                                    <div className="text-orange-900">
                                      ☕ {formatTime(breakLog.break_start_time)} - {breakLog.break_end_time ? formatTime(breakLog.break_end_time) : 'Ongoing'}
                                    </div>
                                    {breakLog.break_duration && typeof breakLog.break_duration === 'number' && (
                                      <div className="text-orange-700">
                                        {(Number(breakLog.break_duration) || 0).toFixed(1)}h
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 text-center mt-4">
                            No shifts
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Detailed List View
                </CardTitle>
                <CardDescription>
                  Comprehensive list of all your time entries with search and filtering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search by date, time, or status..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>

                <div className="space-y-3">
                  {filteredShiftLogs.map((shift) => (
                    <div key={shift.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-gray-900">{formatDate(shift.clock_in_time)}</span>
                          </div>
                          {getStatusBadge(shift.status)}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Duration</div>
                          <div className="font-medium text-gray-900">{calculateShiftDuration(shift)}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                                  {breakLog.break_duration ? `${(Number(breakLog.break_duration) || 0).toFixed(1)}h` : 'Active'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filteredShiftLogs.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No time entries found for this period.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Monthly Overview
                  </CardTitle>
                  <CardDescription>
                    Key metrics and performance indicators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{summary.totalShifts}</div>
                      <div className="text-sm text-blue-700">Total Shifts</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{(Number(summary.totalHours) || 0).toFixed(1)}h</div>
                      <div className="text-sm text-green-700">Total Hours</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{summary.totalBreaks}</div>
                      <div className="text-sm text-orange-700">Total Breaks</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{(Number(summary.averageShiftLength) || 0).toFixed(1)}h</div>
                      <div className="text-sm text-purple-700">Avg Shift</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>
                    Attendance and efficiency indicators
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
                        <span className="text-sm font-medium">{(Number(summary.onTimePercentage) || 0).toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Overtime Hours</span>
                      <span className="text-sm font-medium text-red-600">{(Number(summary.overtimeHours) || 0).toFixed(1)}h</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Break Efficiency</span>
                      <span className="text-sm font-medium text-blue-600">
                        {summary.totalBreaks > 0 ? ((Number(summary.totalBreaks) || 0) / (Number(summary.totalShifts) || 1)).toFixed(1) : 0} per shift
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
