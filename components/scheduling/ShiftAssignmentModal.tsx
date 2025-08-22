"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Clock, User, Calendar } from 'lucide-react'

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

interface ShiftAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  employee: Employee | null
  date: string
  templates: ShiftTemplate[]
  onAssignmentCreated: () => void
}

export default function ShiftAssignmentModal({
  isOpen,
  onClose,
  employee,
  date,
  templates,
  onAssignmentCreated
}: ShiftAssignmentModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [customStartTime, setCustomStartTime] = useState('')
  const [customEndTime, setCustomEndTime] = useState('')
  const [customShiftName, setCustomShiftName] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useCustomShift, setUseCustomShift] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate('')
      setCustomStartTime('')
      setCustomEndTime('')
      setCustomShiftName('')
      setNotes('')
      setUseCustomShift(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!employee) return

    setIsLoading(true)

    try {
      let shiftId = selectedTemplate
      let shiftData = null

      // If using custom shift, create it first
      if (useCustomShift) {
        if (!customShiftName || !customStartTime || !customEndTime) {
          alert('Please fill in all custom shift fields')
          setIsLoading(false)
          return
        }

        const templateResponse = await fetch('/api/scheduling/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: customShiftName,
            start_time: customStartTime,
            end_time: customEndTime,
            department: employee.department,
            color: '#3B82F6'
          })
        })

        if (!templateResponse.ok) {
          const error = await templateResponse.json()
          throw new Error(error.error || 'Failed to create custom shift')
        }

        const templateData = await templateResponse.json()
        shiftId = templateData.data.id
        shiftData = templateData.data
      } else {
        if (!selectedTemplate) {
          alert('Please select a shift template')
          setIsLoading(false)
          return
        }
      }

      // Create the assignment
      const response = await fetch('/api/scheduling/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: employee.id,
          shift_id: shiftId,
          date: date,
          notes: notes
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign shift')
      }

      onAssignmentCreated()
      onClose()
    } catch (error) {
      console.error('Error creating assignment:', error)
      alert(error instanceof Error ? error.message : 'Failed to create assignment')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getSelectedTemplate = () => {
    return templates.find(t => t.id === selectedTemplate)
  }

  const selectedTemplateData = getSelectedTemplate()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Assign Shift
          </DialogTitle>
          <DialogDescription>
            Assign a shift to {employee?.first_name} {employee?.last_name} on {formatDate(date)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Info */}
          {employee && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">
                  {employee.first_name} {employee.last_name}
                </div>
                <div className="text-sm text-gray-500">
                  {employee.employee_id} • {employee.department}
                </div>
              </div>
            </div>
          )}

          {/* Shift Type Selection */}
          <div className="space-y-2">
            <Label>Shift Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!useCustomShift ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCustomShift(false)}
              >
                Use Template
              </Button>
              <Button
                type="button"
                variant={useCustomShift ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCustomShift(true)}
              >
                Custom Shift
              </Button>
            </div>
          </div>

          {!useCustomShift ? (
            /* Template Selection */
            <div className="space-y-2">
              <Label>Select Shift Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shift template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: template.color }}
                        />
                        <span>{template.name}</span>
                        <span className="text-gray-500">
                          ({template.start_time} - {template.end_time})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplateData && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: selectedTemplateData.color }}
                    />
                    <span className="font-medium">{selectedTemplateData.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {selectedTemplateData.start_time} - {selectedTemplateData.end_time}
                    </div>
                    <Badge variant="secondary">{selectedTemplateData.department}</Badge>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Custom Shift Fields */
            <div className="space-y-4">
              <div>
                <Label htmlFor="shiftName">Shift Name</Label>
                <Input
                  id="shiftName"
                  value={customShiftName}
                  onChange={(e) => setCustomShiftName(e.target.value)}
                  placeholder="e.g., Morning Shift"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes for this assignment..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Assigning...' : 'Assign Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
