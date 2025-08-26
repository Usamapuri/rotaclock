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
import ShiftEditModal from './ShiftEditModal'

interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  email: string
  department: string
  job_position: string
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
  template_id: string
  date: string
  status: string
  notes?: string
  template_name: string
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
  const [editing, setEditing] = useState<null | ShiftAssignment>(null)

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
          template_id: templateId,
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
              onClick={() => setEditing(assignment)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{assignment.template_name}</span>
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
        {editing && (
          <ShiftEditModal
            isOpen={!!editing}
            onClose={() => setEditing(null)}
            assignment={editing as any}
            templates={templates}
            onSaved={() => {
              setEditing(null)
              if (onAssignmentCreated) onAssignmentCreated()
            }}
          />
        )}
      </div>
    )
  }

  // If no assignments, show plus button and reveal quick-assign as an overlay without changing layout
  return (
    <div 
      className="relative h-full group flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 rounded-full relative z-20"
        onClick={onAssignShift}
        aria-label="Assign shift"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <div 
        className={`absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-wrap gap-1 justify-center transition-opacity duration-150 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        } pointer-events-none group-hover:pointer-events-auto max-w-full px-1 z-10`}
      >
        {templates.slice(0, 3).map((t) => (
          <button
            key={t.id}
            className="text-[10px] px-1 py-0.5 rounded border bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-gray-50"
            onClick={(e) => { e.stopPropagation(); handleQuickAssign(t.id) }}
            title={`${t.name} ${formatTime(t.start_time)}-${formatTime(t.end_time)}`}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  )
}
