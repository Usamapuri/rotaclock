"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Clock, X } from 'lucide-react'

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
  is_active?: boolean
}

interface Assignment {
  id: string
  employee_id: string
  template_id: string
  date: string
  status: string
  notes?: string
  template: {
    name: string
    start_time: string
    end_time: string
    color: string
    department: string
  }
}

interface ModernShiftCellProps {
  employee: Employee
  date: string
  assignments: Assignment[]
  templates: ShiftTemplate[]
  onAssignShift: () => void
  onRemoveShift: (assignmentId: string) => void
  onAssignmentCreated?: () => void
  onDragStart: (template: ShiftTemplate) => void
  isDragOver?: boolean
}

export default function ModernShiftCell({
  employee,
  date,
  assignments,
  templates,
  onAssignShift,
  onRemoveShift,
  onAssignmentCreated,
  onDragStart,
  isDragOver
}: ModernShiftCellProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/scheduling/assignments/${assignmentId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        onRemoveShift(assignmentId)
      } else {
        console.error('Failed to remove assignment')
      }
    } catch (error) {
      console.error('Error removing assignment:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, template: ShiftTemplate) => {
    e.dataTransfer.setData('application/json', JSON.stringify(template))
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(template)
  }

  const handleDragEnd = () => {
    // Reset any drag state
    setIsHovered(false)
  }

  return (
    <div
      className={`
        relative min-h-[60px] p-2 rounded-lg transition-all duration-200
        ${isDragOver ? 'ring-2 ring-blue-400 bg-blue-50 scale-105' : ''}
        ${assignments.length > 0 ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Existing Assignments */}
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          draggable
          onDragStart={(e) => handleDragStart(e, assignment.template)}
          onDragEnd={handleDragEnd}
          className="mb-1 p-2 rounded text-xs font-medium text-white relative group cursor-move"
          style={{ backgroundColor: assignment.template?.color || '#3B82F6' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">
                {assignment.template?.name || 'Unknown Shift'}
              </div>
              <div className="text-xs opacity-90">
                {assignment.template?.start_time} - {assignment.template?.end_time}
              </div>
            </div>
            
            {isHovered && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 hover:bg-white/30"
                onClick={() => handleRemoveAssignment(assignment.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Empty State with Add Button */}
      {assignments.length === 0 && (
        <div className="flex items-center justify-center h-full min-h-[40px]">
          {isHovered ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
              onClick={onAssignShift}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <div className="text-xs text-gray-400">+</div>
          )}
        </div>
      )}

      {/* Template Quick Assign Dropdown */}
      {isHovered && assignments.length === 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1 text-xs font-medium text-gray-500">Quick Assign</div>
            {templates.filter(t => t.is_active !== false).map((template) => (
              <DropdownMenuItem
                key={template.id}
                className="flex items-center gap-2 cursor-pointer"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/scheduling/assignments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        employee_id: employee.id,
                        date: date,
                        template_id: template.id
                      })
                    })
                    
                    if (res.ok) {
                      onAssignmentCreated?.()
                    }
                  } catch (error) {
                    console.error('Error assigning shift:', error)
                  }
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: template.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{template.name}</div>
                  <div className="text-xs text-gray-500">
                    {template.start_time} - {template.end_time}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer text-blue-600"
              onClick={onAssignShift}
            >
              <Plus className="h-4 w-4" />
              Custom Assignment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Drag and Drop Visual Feedback */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg border-2 border-dashed border-blue-400 flex items-center justify-center">
          <div className="text-xs font-medium text-blue-700">Drop to assign</div>
        </div>
      )}
    </div>
  )
}
