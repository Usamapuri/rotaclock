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
import { Clock, Palette, Settings } from 'lucide-react'

interface ShiftTemplate {
  id: string
  name: string
  description?: string
  start_time: string
  end_time: string
  department: string
  required_staff: number
  hourly_rate?: number
  color: string
  is_active?: boolean
}

interface ShiftTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  template?: ShiftTemplate | null
  onTemplateSaved: () => void
}

const DEPARTMENTS = [
  'General',
  'Sales',
  'Support',
  'Marketing',
  'IT',
  'HR',
  'Operations'
]

const COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' }
]

export default function ShiftTemplateModal({
  isOpen,
  onClose,
  template,
  onTemplateSaved
}: ShiftTemplateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [department, setDepartment] = useState('General')
  const [requiredStaff, setRequiredStaff] = useState(1)
  const [hourlyRate, setHourlyRate] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [isLoading, setIsLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Reset form when modal opens/closes or template changes
  useEffect(() => {
    if (isOpen) {
      if (template) {
        setIsEditMode(true)
        setName(template.name)
        setDescription(template.description || '')
        setStartTime(template.start_time)
        setEndTime(template.end_time)
        setDepartment(template.department)
        setRequiredStaff(template.required_staff)
        setHourlyRate(template.hourly_rate?.toString() || '')
        setColor(template.color)
      } else {
        setIsEditMode(false)
        setName('')
        setDescription('')
        setStartTime('')
        setEndTime('')
        setDepartment('General')
        setRequiredStaff(1)
        setHourlyRate('')
        setColor('#3B82F6')
      }
    }
  }, [isOpen, template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !startTime || !endTime) {
      alert('Please fill in all required fields')
      return
    }

    setIsLoading(true)

    try {
      const templateData: any = {
        name,
        description: description || undefined,
        start_time: startTime,
        end_time: endTime,
        department,
        required_staff: requiredStaff,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        color
      }

      const url = isEditMode && template 
        ? `/api/scheduling/templates` 
        : '/api/scheduling/templates'
      
      const method = isEditMode ? 'PUT' : 'POST'
      
      if (isEditMode && template) {
        templateData.id = template.id
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save template')
      }

      onTemplateSaved()
      onClose()
    } catch (error) {
      console.error('Error saving template:', error)
      alert(error instanceof Error ? error.message : 'Failed to save template')
    } finally {
      setIsLoading(false)
    }
  }

  const getDuration = () => {
    if (!startTime || !endTime) return ''
    
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    
    // Handle overnight shifts
    if (end < start) {
      end.setDate(end.getDate() + 1)
    }
    
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    
    return `${diffHours} hours`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {isEditMode ? 'Edit Shift Template' : 'Create Shift Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update the shift template details below.'
              : 'Create a new shift template that can be used for scheduling.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning Shift"
                required
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this shift template..."
              rows={2}
            />
          </div>

          {/* Time Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Duration</Label>
              <div className="flex items-center h-10 px-3 text-sm bg-gray-50 rounded-md border">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                {getDuration() || 'Set times'}
              </div>
            </div>
          </div>

          {/* Staffing & Pay */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="requiredStaff">Required Staff</Label>
              <Input
                id="requiredStaff"
                type="number"
                min="1"
                value={requiredStaff}
                onChange={(e) => setRequiredStaff(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label htmlFor="hourlyRate">Hourly Rate (Optional)</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color
            </Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`
                    p-3 rounded-lg border-2 transition-all
                    ${color === colorOption.value 
                      ? 'border-gray-900 scale-105' 
                      : 'border-gray-200 hover:border-gray-400'
                    }
                  `}
                  style={{ backgroundColor: colorOption.value }}
                >
                  <div className="text-white text-xs font-medium">
                    {colorOption.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {(name && startTime && endTime) && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium mb-2">Preview</div>
              <div 
                className="p-3 rounded text-white text-sm"
                style={{ backgroundColor: color }}
              >
                <div className="font-medium">{name}</div>
                <div className="opacity-90">
                  {startTime} - {endTime} • {getDuration()}
                </div>
                <div className="opacity-75">
                  {department} • {requiredStaff} staff required
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? (isEditMode ? 'Updating...' : 'Creating...') 
                : (isEditMode ? 'Update Template' : 'Create Template')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
