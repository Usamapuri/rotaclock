"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Users, Clock, Calendar, TrendingUp } from 'lucide-react'
import { AuthService } from '@/lib/auth'

interface TimeSlot {
  time: string
  shifts: ShiftCoverage[]
  totalAgents: number
  status: 'understaffed' | 'optimal' | 'overstaffed'
}

interface ShiftCoverage {
  id: string
  name: string
  employee_name: string
  employee_id: string
  start_time: string
  end_time: string
  rota_name?: string
  is_published: boolean
}

interface CoverageAnalysis {
  date: string
  timeSlots: TimeSlot[]
  dailyStats: {
    totalShifts: number
    totalAgents: number
    totalHours: number
    understaffedSlots: number
    optimalSlots: number
    overstaffedSlots: number
  }
}

interface MasterCalendarProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export default function MasterCalendar({ selectedDate, onDateChange }: MasterCalendarProps) {
  const [coverageData, setCoverageData] = useState<CoverageAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [weekStats, setWeekStats] = useState({
    totalShifts: 0,
    totalHours: 0,
    avgCoverage: 0,
    criticalGaps: 0
  })

  useEffect(() => {
    loadCoverageAnalysis()
  }, [selectedDate])

  const loadCoverageAnalysis = async () => {
    try {
      setIsLoading(true)
      const user = AuthService.getCurrentUser()
      
      // Load all shifts for the week (both draft and published for coverage analysis)
      const res = await fetch(`/api/scheduling/week/${selectedDate}`, {
        headers: user?.id ? { authorization: `Bearer ${user.id}` } : {}
      })
      const data = await res.json()
      
      if (data.success) {
        const analysis = generateCoverageAnalysis(data.data.employees)
        setCoverageData(analysis)
        calculateWeekStats(analysis)
      }
    } catch (error) {
      console.error('Error loading coverage analysis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateCoverageAnalysis = (employees: any[]): CoverageAnalysis[] => {
    const weekDates = getWeekDates()
    const timeSlots = generateTimeSlots()
    
    return weekDates.map(date => {
      const dayAnalysis: CoverageAnalysis = {
        date,
        timeSlots: timeSlots.map(time => ({
          time,
          shifts: [],
          totalAgents: 0,
          status: 'understaffed' as const
        })),
        dailyStats: {
          totalShifts: 0,
          totalAgents: 0,
          totalHours: 0,
          understaffedSlots: 0,
          optimalSlots: 0,
          overstaffedSlots: 0
        }
      }

      // Collect all shifts for this date
      const dayShifts: ShiftCoverage[] = []
      employees.forEach(emp => {
        const assignments = emp.assignments[date] || []
        assignments.forEach((assignment: any) => {
          const startTime = assignment.start_time || assignment.template_start_time
          const endTime = assignment.end_time || assignment.template_end_time
          
          if (startTime && endTime) {
            dayShifts.push({
              id: assignment.id,
              name: assignment.shift_name || assignment.template_name || 'Shift',
              employee_name: `${emp.first_name} ${emp.last_name}`,
              employee_id: emp.id,
              start_time: startTime,
              end_time: endTime,
              rota_name: assignment.rota_name,
              is_published: assignment.is_published
            })
          }
        })
      })

      // Assign shifts to time slots
      dayAnalysis.timeSlots.forEach(slot => {
        const slotTime = slot.time
        slot.shifts = dayShifts.filter(shift => 
          isTimeInRange(slotTime, shift.start_time, shift.end_time)
        )
        slot.totalAgents = slot.shifts.length
        
        // Determine coverage status (you can adjust these thresholds)
        if (slot.totalAgents === 0) {
          slot.status = 'understaffed'
        } else if (slot.totalAgents >= 1 && slot.totalAgents <= 3) {
          slot.status = 'optimal'
        } else {
          slot.status = 'overstaffed'
        }
      })

      // Calculate daily stats
      const uniqueEmployees = new Set(dayShifts.map(s => s.employee_id))
      dayAnalysis.dailyStats = {
        totalShifts: dayShifts.length,
        totalAgents: uniqueEmployees.size,
        totalHours: calculateTotalHours(dayShifts),
        understaffedSlots: dayAnalysis.timeSlots.filter(s => s.status === 'understaffed').length,
        optimalSlots: dayAnalysis.timeSlots.filter(s => s.status === 'optimal').length,
        overstaffedSlots: dayAnalysis.timeSlots.filter(s => s.status === 'overstaffed').length
      }

      return dayAnalysis
    })
  }

  const generateTimeSlots = (): string[] => {
    const slots = []
    for (let hour = 6; hour < 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return slots
  }

  const isTimeInRange = (checkTime: string, startTime: string, endTime: string): boolean => {
    const check = timeToMinutes(checkTime)
    const start = timeToMinutes(startTime)
    const end = timeToMinutes(endTime)
    return check >= start && check < end
  }

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const calculateTotalHours = (shifts: ShiftCoverage[]): number => {
    return shifts.reduce((total, shift) => {
      const start = timeToMinutes(shift.start_time)
      const end = timeToMinutes(shift.end_time)
      return total + (end - start) / 60
    }, 0)
  }

  const calculateWeekStats = (analysis: CoverageAnalysis[]) => {
    const totalShifts = analysis.reduce((sum, day) => sum + day.dailyStats.totalShifts, 0)
    const totalHours = analysis.reduce((sum, day) => sum + day.dailyStats.totalHours, 0)
    const criticalGaps = analysis.reduce((sum, day) => sum + day.dailyStats.understaffedSlots, 0)
    const totalSlots = analysis.reduce((sum, day) => sum + day.timeSlots.length, 0)
    const coveredSlots = totalSlots - criticalGaps
    
    setWeekStats({
      totalShifts,
      totalHours: Math.round(totalHours * 10) / 10,
      avgCoverage: Math.round((coveredSlots / totalSlots) * 100),
      criticalGaps
    })
  }

  const getWeekDates = () => {
    const startDate = new Date(selectedDate)
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    return dates
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'understaffed': return 'bg-red-100 text-red-800 border-red-200'
      case 'optimal': return 'bg-green-100 text-green-800 border-green-200'
      case 'overstaffed': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate)
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    onDateChange(newDate.toISOString().split('T')[0])
  }

  const weekDates = getWeekDates()
  const weekRange = `${formatDate(weekDates[0]).day} ${formatDate(weekDates[0]).date} ${formatDate(weekDates[0]).month} - ${formatDate(weekDates[6]).day} ${formatDate(weekDates[6]).date} ${formatDate(weekDates[6]).month}`

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Analyzing coverage...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Master Calendar</h2>
          <p className="text-gray-500">Comprehensive coverage analysis with gap detection</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={viewMode} onValueChange={(value: 'week' | 'day') => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week View</SelectItem>
              <SelectItem value="day">Day View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week Navigation & Stats */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <div className="font-semibold text-lg">{weekRange}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="h-4 w-4" />
                {weekStats.totalShifts} shifts
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <TrendingUp className="h-4 w-4" />
                {weekStats.avgCoverage}% coverage
              </div>
              <div className={`flex items-center gap-1 ${weekStats.criticalGaps > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {weekStats.criticalGaps > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                {weekStats.criticalGaps} gaps
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Coverage Grid */}
      <Card>
        <CardContent className="p-0">
          {coverageData.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Coverage Data</h3>
              <p className="text-gray-500">No shifts found for coverage analysis</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium text-gray-900 min-w-[80px]">Time</th>
                    {coverageData.map((day) => {
                      const formatted = formatDate(day.date)
                      return (
                        <th key={day.date} className="text-center p-4 font-medium text-gray-900 min-w-[120px]">
                          <div>{formatted.day}</div>
                          <div className="text-sm font-normal text-gray-500">{formatted.month} {formatted.date}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {day.dailyStats.totalShifts} shifts
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {generateTimeSlots().map((timeSlot) => (
                    <tr key={timeSlot} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">{timeSlot}</td>
                      {coverageData.map((day) => {
                        const slot = day.timeSlots.find(s => s.time === timeSlot)
                        if (!slot) return <td key={day.date} className="p-2"></td>
                        
                        return (
                          <td key={day.date} className="p-2 text-center">
                            <div className={`px-2 py-1 rounded text-xs border ${getStatusColor(slot.status)}`}>
                              <div className="font-medium">{slot.totalAgents} agents</div>
                              {slot.shifts.length > 0 && (
                                <div className="text-xs mt-1 space-y-1">
                                  {slot.shifts.slice(0, 2).map((shift, idx) => (
                                    <div key={idx} className="truncate">
                                      {shift.name}
                                    </div>
                                  ))}
                                  {slot.shifts.length > 2 && (
                                    <div>+{slot.shifts.length - 2} more</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
          <span>Understaffed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
          <span>Optimal Coverage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
          <span>Overstaffed</span>
        </div>
      </div>
    </div>
  )
}
