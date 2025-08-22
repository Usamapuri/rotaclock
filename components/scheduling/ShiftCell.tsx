"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Clock } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
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

interface ShiftAssignment {
  id: string
  employee_id: string
  shift_id: string
  date: string
  status: string
  notes?: string
  shift_name: string
  start_time: string
  end_time: string
  color: string
}

interface ShiftCellProps {
  employee: Employee
  date: string
  assignments: ShiftAssignment[]
  templates: ShiftTemplate[]
  onAssignShift: () => void
  onRemoveShift: (assignmentId: string) => void
  onAssignmentCreated?: () => void
}

export default function ShiftCell({
  employee,
  date,
  assignments,
  templates,
  onAssignShift,
  onRemoveShift,
  onAssignmentCreated
}: ShiftCellProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formatTime = (time: string) => {
    return time.substring(0, 5) // Remove seconds if present
  }

  const getShiftDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    
    // Handle overnight shifts
    if (end < start) {
      end.setDate(end.getDate() + 1)
    }
    
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    
    return `${diffHours}h`
  }

  const handleQuickAssign = async (templateId: string) => {
    try {
      const response = await fetch('/api/scheduling/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: employee.id,
          shift_id: templateId,
          date: date,
          notes: ''
        })
      })

       if (response.ok) {
         // Trigger refresh of the schedule
         if (onAssignmentCreated) {
           onAssignmentCreated()
         } else {
           window.location.reload()
         }
       } else {
        const error = await response.json()
        alert(`Failed to assign shift: ${error.error}`)
      }
    } catch (error) {
      console.error('Error assigning shift:', error)
      alert('Failed to assign shift')
    }
  }

  const handleRemoveShift = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this shift assignment?')) {
      return
    }

    try {
      const response = await fetch(`/api/scheduling/assign?id=${assignmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onRemoveShift(assignmentId)
      } else {
        const error = await response.json()
        alert(`Failed to remove shift: ${error.error}`)
      }
    } catch (error) {
      console.error('Error removing shift:', error)
      alert('Failed to remove shift')
    }
  }

  // If there are assignments, show them
  if (assignments.length > 0) {
    return (
      <div 
        className="h-full flex flex-col justify-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="relative group"
          >
            <div
              className="p-2 rounded text-xs font-medium text-white cursor-pointer transition-all"
              style={{ backgroundColor: assignment.color }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{assignment.shift_name}</span>
                </div>
                {isHovered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-white hover:bg-white/20"
                    onClick={() => handleRemoveShift(assignment.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="text-xs opacity-90 mt-1">
                {formatTime(assignment.start_time)} - {formatTime(assignment.end_time)}
              </div>
              <div className="text-xs opacity-75">
                {getShiftDuration(assignment.start_time, assignment.end_time)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // If no assignments, show plus button
  return (
    <div 
      className="h-full flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-full"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <div className="px-2 py-1 text-xs text-gray-500 border-b">
              Quick Assign
            </div>
            {templates.map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => handleQuickAssign(template.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: template.color }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{template.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatTime(template.start_time)} - {formatTime(template.end_time)}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <div className="border-t pt-1">
              <DropdownMenuItem
                onClick={onAssignShift}
                className="text-blue-600 cursor-pointer"
              >
                Custom Assignment...
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
          <Plus className="h-3 w-3 text-gray-400" />
        </div>
      )}
    </div>
  )
}
