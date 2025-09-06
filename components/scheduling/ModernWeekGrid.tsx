"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar, Plus, Search, Filter, MoreHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import ModernShiftCell from './ModernShiftCell'

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
  is_active?: boolean
}

interface ModernWeekGridProps {
  employees: Employee[]
  templates: ShiftTemplate[]
  selectedDate: string
  viewMode: 'grid' | 'list'
  onDateChange: (date: string) => void
  onAssignShift: (employeeId: string, date: string) => void
  onDragDrop: (employeeId: string, date: string, templateId: string) => void
  onRemoveShift: (assignmentId: string) => void
  onAssignmentCreated?: () => void
}

export default function ModernWeekGrid({
  employees,
  templates,
  selectedDate,
  viewMode,
  onDateChange,
  onAssignShift,
  onDragDrop,
  onRemoveShift,
  onAssignmentCreated
}: ModernWeekGridProps) {
  const [weekStart, setWeekStart] = useState<Date>(new Date())
  const [weekDays, setWeekDays] = useState<string[]>([])
  const [search, setSearch] = useState<string>('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [draggedTemplate, setDraggedTemplate] = useState<ShiftTemplate | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{ employeeId: string; date: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const dragTimeoutRef = useRef<NodeJS.Timeout>()

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
    const matchesSearch = !q || 
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.employee_code.toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q)
    
    const matchesDepartment = departmentFilter === 'all' || e.department === departmentFilter
    
    return matchesSearch && matchesDepartment
  })

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)))

  const handleDragStart = (template: ShiftTemplate) => {
    setDraggedTemplate(template)
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent, employeeId: string, date: string) => {
    e.preventDefault()
    // Clear any existing timeout to prevent flickering
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current)
    }
    setDragOverCell({ employeeId, date })
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Add a small delay before clearing the drag over state to prevent flickering
    dragTimeoutRef.current = setTimeout(() => {
      setDragOverCell(null)
    }, 50)
  }

  const handleDrop = async (e: React.DragEvent, employeeId: string, date: string) => {
    e.preventDefault()
    setDragOverCell(null)
    
    if (!draggedTemplate || isAssigning) return

    try {
      setIsAssigning(true)
      await onDragDrop(employeeId, date, draggedTemplate.id)
    } finally {
      setIsAssigning(false)
      setDraggedTemplate(null)
      setIsDragging(false)
    }
  }

  const handleDragEnd = () => {
    setDraggedTemplate(null)
    setIsDragging(false)
    setDragOverCell(null)
  }

  if (viewMode === 'list') {
    return (
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Week Schedule - List View
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees..."
                className="pl-9"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {departmentFilter === 'all' ? 'All Departments' : departmentFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setDepartmentFilter('all')}>
                  All Departments
                </DropdownMenuItem>
                {departments.map(dept => (
                  <DropdownMenuItem key={dept} onClick={() => setDepartmentFilter(dept)}>
                    {dept}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="text-sm text-gray-500">
            {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="space-y-4">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {employee.first_name} {employee.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {employee.employee_code} • {employee.department}
                    </p>
                  </div>
                  <Badge variant="outline">{employee.job_position}</Badge>
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className={`
                        p-3 border rounded-lg min-h-[80px] relative
                        ${isWeekend(day) ? 'bg-gray-50' : 'bg-white'}
                        ${isToday(day) ? 'ring-2 ring-blue-200' : ''}
                        ${dragOverCell?.employeeId === employee.id && dragOverCell?.date === day ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
                      `}
                      onDragOver={(e) => handleDragOver(e, employee.id, day)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, employee.id, day)}
                    >
                      <div className="text-xs text-gray-500 mb-2">
                        {new Date(day).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <ModernShiftCell
                        employee={employee}
                        date={day}
                        assignments={employee.assignments?.[day] || []}
                        templates={templates}
                        onAssignShift={() => onAssignShift(employee.id, day)}
                        onRemoveShift={onRemoveShift}
                        onAssignmentCreated={onAssignmentCreated}
                        onDragStart={handleDragStart}
                        isDragOver={dragOverCell?.employeeId === employee.id && dragOverCell?.date === day}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Week Schedule - Grid View
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="pl-9"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {departmentFilter === 'all' ? 'All Departments' : departmentFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setDepartmentFilter('all')}>
                All Departments
              </DropdownMenuItem>
              {departments.map(dept => (
                <DropdownMenuItem key={dept} onClick={() => setDepartmentFilter(dept)}>
                  {dept}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
              <div className="p-4 font-medium text-sm text-gray-600">
                Employee
              </div>
              {weekDays.map((day) => (
                <div
                  key={day}
                  className={`
                    p-4 text-center font-medium text-sm
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
              <div className="space-y-1">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="grid grid-cols-8 gap-1 border-b hover:bg-gray-50 transition-colors">
                    <div className="p-4 border-r">
                      <div className="font-medium text-sm text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.employee_code} • {employee.department}
                      </div>
                    </div>
                    
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className={`
                          p-2 border-r min-h-[80px] relative
                          ${isWeekend(day) ? 'bg-gray-50' : ''}
                          ${isToday(day) ? 'bg-blue-25' : ''}
                          ${dragOverCell?.employeeId === employee.id && dragOverCell?.date === day ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
                        `}
                        onDragOver={(e) => handleDragOver(e, employee.id, day)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, employee.id, day)}
                      >
                        <ModernShiftCell
                          employee={employee}
                          date={day}
                          assignments={employee.assignments?.[day] || []}
                          templates={templates}
                          onAssignShift={() => onAssignShift(employee.id, day)}
                          onRemoveShift={onRemoveShift}
                          onAssignmentCreated={onAssignmentCreated}
                          onDragStart={handleDragStart}
                          isDragOver={dragOverCell?.employeeId === employee.id && dragOverCell?.date === day}
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
