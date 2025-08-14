"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  Calendar, 
  User, 
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowLeft
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

export default function TimeHistory() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([])
  const [breakLogs, setBreakLogs] = useState<BreakLog[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user) {
      router.push('/employee/login')
    } else {
      setCurrentUser(user)
      loadTimeHistory()
    }
  }, [router, selectedMonth])

  const loadTimeHistory = async () => {
    try {
      setLoading(true)
      const user = AuthService.getCurrentUser()
      if (!user) return

      const startDate = getMonthStart(selectedMonth)
      const endDate = getMonthEnd(selectedMonth)

      // Load shift logs for the selected month
      const shiftLogsResponse = await fetch(`/api/shift-logs?employee_id=${user.id}&start_date=${startDate}&end_date=${endDate}`)
      if (shiftLogsResponse.ok) {
        const shiftLogsData = await shiftLogsResponse.json()
        if (shiftLogsData.success) {
          setShiftLogs(shiftLogsData.data)
        }
      }

      // Load break logs for the selected month
      const breakLogsResponse = await fetch(`/api/break-logs?employee_id=${user.id}&start_date=${startDate}&end_date=${endDate}`)
      if (breakLogsResponse.ok) {
        const breakLogsData = await breakLogsResponse.json()
        if (breakLogsData.success) {
          setBreakLogs(breakLogsData.data)
        }
      }
    } catch (error) {
      console.error('Error loading time history:', error)
      toast.error('Failed to load time history')
    } finally {
      setLoading(false)
    }
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
    router.push('/employee/login')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>
      case 'completed':
        return <Badge variant="outline">Completed</Badge>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading time history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/employee/dashboard">
                <div className="flex items-center">
                  <ArrowLeft className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="text-xl font-bold text-gray-900">Time History</span>
                </div>
              </Link>
              <Badge variant="outline">View your clock-in/out logs</Badge>
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
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous Month
          </Button>
          <div className="text-center">
            <h2 className="text-2xl font-semibold">
              {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-sm text-gray-600">Your time tracking history</p>
          </div>
          <Button variant="outline" onClick={handleNextMonth}>
            Next Month
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Calendar View */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Time Tracking Calendar
            </CardTitle>
            <CardDescription>
              View your clock-in/out times and breaks for each day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-medium text-gray-700 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const dateString = day.toISOString().split('T')[0]
                const dayShifts = getShiftsForDate(dateString)
                const isCurrentMonth = day.getMonth() === selectedMonth.getMonth()
                
                return (
                  <div 
                    key={index} 
                    className={`min-h-32 border rounded-lg p-2 ${
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      {day.getDate()}
                    </div>
                    
                    {dayShifts.length > 0 ? (
                      <div className="space-y-1">
                        {dayShifts.map((shift) => (
                          <div key={shift.id} className="text-xs bg-blue-50 border border-blue-200 rounded p-1">
                            <div className="font-medium text-blue-900">
                              {formatTime(shift.clock_in_time)} - {shift.clock_out_time ? formatTime(shift.clock_out_time) : 'Ongoing'}
                            </div>
                            <div className="text-blue-700">
                              {calculateShiftDuration(shift)}
                            </div>
                            {getStatusBadge(shift.status)}
                            
                            {/* Show breaks for this shift */}
                            {getBreaksForShift(shift.id).map((breakLog) => (
                              <div key={breakLog.id} className="mt-1 text-xs bg-orange-50 border border-orange-200 rounded p-1">
                                <div className="text-orange-900">
                                  Break: {formatTime(breakLog.break_start_time)} - {breakLog.break_end_time ? formatTime(breakLog.break_end_time) : 'Ongoing'}
                                </div>
                                {breakLog.break_duration && typeof breakLog.break_duration === 'number' && (
                                  <div className="text-orange-700">
                                    Duration: {breakLog.break_duration.toFixed(1)}h
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

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Total Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{shiftLogs.length}</div>
              <p className="text-sm text-gray-500">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Total Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {shiftLogs.reduce((total, shift) => {
                  if (shift.total_shift_hours && typeof shift.total_shift_hours === 'number') {
                    return total + shift.total_shift_hours
                  }
                  return total
                }, 0).toFixed(1)}h
              </div>
              <p className="text-sm text-gray-500">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Total Breaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{breakLogs.length}</div>
              <p className="text-sm text-gray-500">This month</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
