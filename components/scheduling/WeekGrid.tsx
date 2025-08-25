"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react'
import ShiftCell from './ShiftCell'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  email: string
  department: string
  job_position: string
  assignments?: { [date: string]: any[] }
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
  onAssignmentCreated?: () => void
}

export default function WeekGrid({
  employees,
  templates,
  selectedDate,
  onDateChange,
  onAssignShift,
  onRemoveShift,
  onAssignmentCreated
}: WeekGridProps) {
  const [weekStart, setWeekStart] = useState<Date>(new Date())
  const [weekDays, setWeekDays] = useState<string[]>([])
  const [search, setSearch] = useState<string>('')

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

  const goToPreviousWeek = async () => {
    const newWeekStart = new Date(weekStart)
    newWeekStart.setDate(weekStart.getDate() - 7)
    setWeekStart(newWeekStart)
    await onDateChange(newWeekStart.toISOString().split('T')[0])
  }

  const goToNextWeek = async () => {
    const newWeekStart = new Date(weekStart)
    newWeekStart.setDate(weekStart.getDate() + 7)
    setWeekStart(newWeekStart)
    await onDateChange(newWeekStart.toISOString().split('T')[0])
  }

  const goToCurrentWeek = async () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysToMonday)
    
    setWeekStart(monday)
    await onDateChange(today.toISOString().split('T')[0])
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

  const filteredEmployees = employees.filter((e) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.employee_code.toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q)
    )
  })

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
        
        <div className="mt-3 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees by name, code, email, department"
            className="pl-9"
          />
        </div>

        <div className="text-sm text-gray-500">
          {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-max">
                         {/* Header row with day names */}
             <div className="grid grid-cols-7 gap-1 border-b bg-gray-50">
               {weekDays.map((day) => (
                 <div
                   key={day}
                   className={`
                     p-3 text-center font-medium text-sm
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
             {filteredEmployees.length === 0 ? (
               <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                 No employees to display
               </div>
             ) : (
               <div className="space-y-2">
                 {filteredEmployees.map((employee) => (
                   <div key={employee.id} className="border rounded-lg p-3">
                     <div className="font-medium text-sm mb-2">
                       {employee.first_name} {employee.last_name} ({employee.employee_code})
                     </div>
                     <div className="grid grid-cols-7 gap-1">
                       {weekDays.map((day) => (
                         <div
                           key={day}
                           className={`
                             p-2 border rounded min-h-[60px] relative
                             ${isWeekend(day) ? 'bg-gray-50' : ''}
                             ${isToday(day) ? 'bg-blue-25' : ''}
                           `}
                         >
                           <div className="text-xs text-gray-500 mb-1">
                             {new Date(day).toLocaleDateString('en-US', { weekday: 'short' })}
                           </div>
                           <ShiftCell
                             employee={employee}
                             date={day}
                             assignments={employee.assignments?.[day] || []}
                             templates={templates}
                             onAssignShift={() => onAssignShift(employee.id, day)}
                             onRemoveShift={onRemoveShift}
                             onAssignmentCreated={onAssignmentCreated}
                           />
                         </div>
                       ))}
                     </div>
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
