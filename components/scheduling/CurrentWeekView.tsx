"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Eye, Users, Clock, Calendar } from 'lucide-react'
import { AuthService } from '@/lib/auth'

interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  assignments: { [key: string]: Assignment[] }
}

interface Assignment {
  id: string
  employee_id: string
  shift_date: string
  shift_name?: string
  start_time?: string
  end_time?: string
  template_name?: string
  template_start_time?: string
  template_end_time?: string
  is_published: boolean
  rota_id?: string
  rota_name?: string
}

interface CurrentWeekViewProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export default function CurrentWeekView({ selectedDate, onDateChange }: CurrentWeekViewProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [weekStats, setWeekStats] = useState({
    totalShifts: 0,
    totalEmployees: 0,
    totalHours: 0,
    publishedRota: null as string | null
  })

  useEffect(() => {
    loadCurrentWeek()
  }, [selectedDate])

  const loadCurrentWeek = async () => {
    try {
      setIsLoading(true)
      const user = AuthService.getCurrentUser()
      
      // Load only published shifts for the current week
      const res = await fetch(`/api/scheduling/week/${selectedDate}?published_only=true`, {
        headers: user?.id ? { authorization: `Bearer ${user.id}` } : {}
      })
      const data = await res.json()
      
      if (data.success) {
        const employeeData = data.data.employees.map((e: any) => ({ ...e, assignments: e.assignments || {} }))
        setEmployees(employeeData)
        
        // Calculate stats
        let totalShifts = 0
        let totalHours = 0
        const employeesWithShifts = new Set()
        let publishedRotaName = null
        
        employeeData.forEach((emp: Employee) => {
          Object.values(emp.assignments).forEach((dayAssignments) => {
            dayAssignments.forEach((assignment) => {
              if (assignment.is_published) {
                totalShifts++
                employeesWithShifts.add(emp.id)
                
                // Calculate hours
                const startTime = assignment.start_time || assignment.template_start_time
                const endTime = assignment.end_time || assignment.template_end_time
                if (startTime && endTime) {
                  const start = new Date(`1970-01-01T${startTime}`)
                  const end = new Date(`1970-01-01T${endTime}`)
                  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                  totalHours += hours
                }
                
                if (!publishedRotaName && assignment.rota_name) {
                  publishedRotaName = assignment.rota_name
                }
              }
            })
          })
        })
        
        setWeekStats({
          totalShifts,
          totalEmployees: employeesWithShifts.size,
          totalHours: Math.round(totalHours * 10) / 10,
          publishedRota: publishedRotaName
        })
      }
    } catch (error) {
      console.error('Error loading current week:', error)
    } finally {
      setIsLoading(false)
    }
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

  const getShiftDisplay = (assignment: Assignment) => {
    const name = assignment.shift_name || assignment.template_name || 'Shift'
    const startTime = assignment.start_time || assignment.template_start_time || '09:00'
    const endTime = assignment.end_time || assignment.template_end_time || '17:00'
    return { name, startTime, endTime }
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
          <p className="text-gray-500">Loading current week view...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Current Week View</h2>
          <p className="text-gray-500">Read-only view showing exactly what employees see</p>
        </div>
        <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
          <Eye className="h-3 w-3 mr-1" />
          Employee Perspective
        </Badge>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <div className="font-semibold text-lg">{weekRange}</div>
                {weekStats.publishedRota && (
                  <div className="text-sm text-gray-500">Rota: {weekStats.publishedRota}</div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {weekStats.totalShifts} shifts
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {weekStats.totalEmployees} employees
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {weekStats.totalHours}h total
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Schedule Grid */}
      <Card>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Published Shifts</h3>
              <p className="text-gray-500">No published shifts are visible to employees for this week</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium text-gray-900 min-w-[150px]">Employee</th>
                    {weekDates.map((date) => {
                      const formatted = formatDate(date)
                      return (
                        <th key={date} className="text-center p-4 font-medium text-gray-900 min-w-[120px]">
                          <div>{formatted.day}</div>
                          <div className="text-sm font-normal text-gray-500">{formatted.month} {formatted.date}</div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{employee.employee_code}</div>
                      </td>
                      {weekDates.map((date) => {
                        const dayAssignments = employee.assignments[date] || []
                        const publishedAssignments = dayAssignments.filter(a => a.is_published)
                        
                        return (
                          <td key={date} className="p-2 text-center">
                            <div className="space-y-1">
                              {publishedAssignments.map((assignment) => {
                                const { name, startTime, endTime } = getShiftDisplay(assignment)
                                return (
                                  <div
                                    key={assignment.id}
                                    className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded border border-green-200"
                                  >
                                    <div className="font-medium">{name}</div>
                                    <div className="text-xs">{startTime} - {endTime}</div>
                                  </div>
                                )
                              })}
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
    </div>
  )
}
