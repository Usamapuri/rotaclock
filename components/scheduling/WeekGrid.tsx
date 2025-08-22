"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react'
import ShiftCell from './ShiftCell'

interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  assignments: { [date: string]: any[] }
}

interface ShiftTemplate {
  id: string
  name: string
  start_time: string
  end_time: string
  department: string
  color: string
  required_staff: number
}

interface WeekGridProps {
  employees: Employee[]
  templates: ShiftTemplate[]
  selectedDate: string
  onDateChange: (date: string) => void
  onAssignShift: (employeeId: string, date: string) => void
  onRemoveShift: (assignmentId: string) => void
}

export default function WeekGrid({
  employees,
  templates,
  selectedDate,
  onDateChange,
  onAssignShift,
  onRemoveShift
}: WeekGridProps) {
  const [weekStart, setWeekStart] = useState<Date>(new Date())
  const [weekDays, setWeekDays] = useState<string[]>([])

  // Initialize week when selectedDate changes
  useEffect(() => {
    const date = new Date(selectedDate)
    const dayOfWeek = date.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(date)
    monday.setDate(date.getDate() - daysToMonday)
    
    setWeekStart(monday)
  }, [selectedDate])

  // Generate week days
  useEffect(() => {
    const days: string[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      days.push(day.toISOString().split('T')[0])
    }
    setWeekDays(days)
  }, [weekStart])

  const goToPreviousWeek = () => {
    const newWeekStart = new Date(weekStart)
    newWeekStart.setDate(weekStart.getDate() - 7)
    setWeekStart(newWeekStart)
    onDateChange(newWeekStart.toISOString().split('T')[0])
  }

  const goToNextWeek = () => {
    const newWeekStart = new Date(weekStart)
    newWeekStart.setDate(weekStart.getDate() + 7)
    setWeekStart(newWeekStart)
    onDateChange(newWeekStart.toISOString().split('T')[0])
  }

  const goToCurrentWeek = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysToMonday)
    
    setWeekStart(monday)
    onDateChange(today.toISOString().split('T')[0])
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateString === today
  }

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString)
    return date.getDay() === 0 || date.getDay() === 6
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Week Schedule
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentWeek}
            >
              Today
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header row with day names */}
            <div className="grid grid-cols-8 gap-1 border-b bg-gray-50">
              <div className="p-3 font-medium text-sm text-gray-700">
                Employee
              </div>
              {weekDays.map((day) => (
                <div
                  key={day}
                  className={`
                    p-3 text-center font-medium text-sm border-l
                    ${isToday(day) ? 'bg-blue-50 text-blue-700' : ''}
                    ${isWeekend(day) ? 'bg-gray-100' : ''}
                  `}
                >
                  <div className="font-semibold">
                    {new Date(day).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(day).getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Employee rows */}
            {employees.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                No employees to display
              </div>
            ) : (
              <div className="divide-y">
                {employees.map((employee) => (
                  <div key={employee.id} className="grid grid-cols-8 gap-1">
                    {/* Employee info column */}
                    <div className="p-3 border-r bg-gray-50">
                      <div className="font-medium text-sm">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.employee_id}
                      </div>
                      <Badge 
                        variant="secondary" 
                        className="text-xs mt-1"
                      >
                        {employee.department}
                      </Badge>
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className={`
                          p-2 border-r min-h-[80px] relative
                          ${isWeekend(day) ? 'bg-gray-50' : ''}
                          ${isToday(day) ? 'bg-blue-25' : ''}
                        `}
                      >
                        <ShiftCell
                          employee={employee}
                          date={day}
                          assignments={employee.assignments[day] || []}
                          templates={templates}
                          onAssignShift={() => onAssignShift(employee.id, day)}
                          onRemoveShift={onRemoveShift}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
