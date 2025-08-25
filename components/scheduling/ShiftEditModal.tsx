"use client"

import { useEffect, useMemo, useState } from 'react'
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
import { Calendar, Clock } from 'lucide-react'

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
  template_id: string | null
  date: string
  status: string
  notes?: string
  template_name: string
  start_time: string
  end_time: string
  color: string
  override_name?: string | null
  override_start_time?: string | null
  override_end_time?: string | null
  override_color?: string | null
}

interface ShiftEditModalProps {
  isOpen: boolean
  onClose: () => void
  assignment: ShiftAssignment
  templates: ShiftTemplate[]
  onSaved: () => void
}

export default function ShiftEditModal({ isOpen, onClose, assignment, templates, onSaved }: ShiftEditModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [useCustom, setUseCustom] = useState<boolean>(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!isOpen) return
    // Determine if this assignment is using overrides
    const isOverride = !!(assignment.override_name || assignment.override_start_time || assignment.override_end_time)
    setUseCustom(isOverride || !assignment.template_id)
    setSelectedTemplate(assignment.template_id || '')
    setName(assignment.override_name || assignment.template_name)
    setStartTime((assignment.override_start_time as string) || assignment.start_time)
    setEndTime((assignment.override_end_time as string) || assignment.end_time)
    setColor((assignment.override_color as string) || assignment.color || '#3B82F6')
    setNotes(assignment.notes || '')
  }, [isOpen, assignment])

  const selectedTemplateData = useMemo(() => templates.find(t => t.id === selectedTemplate), [templates, selectedTemplate])

  useEffect(() => {
    if (!useCustom && selectedTemplateData) {
      setName(selectedTemplateData.name)
      setStartTime(selectedTemplateData.start_time)
      setEndTime(selectedTemplateData.end_time)
      setColor(selectedTemplateData.color)
    }
  }, [useCustom, selectedTemplateData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const body: any = { id: assignment.id, notes }
      if (useCustom) {
        body.template_id = null
        // Send overrides only if provided to avoid null-violations on older schemas
        if (name) body.override_name = name
        if (startTime) body.override_start_time = startTime
        if (endTime) body.override_end_time = endTime
        if (color) body.override_color = color
      } else {
        if (!selectedTemplate) {
          alert('Please select a template or switch to Custom')
          setIsLoading(false)
          return
        }
        body.template_id = selectedTemplate
      }

      const res = await fetch('/api/scheduling/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update assignment')
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to update assignment')
    } finally {
      setIsLoading(false)
    }
  }

  const getDuration = () => {
    if (!startTime || !endTime) return ''
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    if (end < start) end.setDate(end.getDate() + 1)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    return `${diffHours}h`
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Edit Shift
          </DialogTitle>
          <DialogDescription>
            Update the scheduled shift for this day.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <Button type="button" variant={!useCustom ? 'default' : 'outline'} size="sm" onClick={() => setUseCustom(false)}>Use Template</Button>
            <Button type="button" variant={useCustom ? 'default' : 'outline'} size="sm" onClick={() => setUseCustom(true)}>Custom</Button>
          </div>

          {!useCustom ? (
            <div className="space-y-2">
              <Label>Shift Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shift template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                        <span>{t.name}</span>
                        <span className="text-gray-500">({t.start_time} - {t.end_time})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplateData && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedTemplateData.color }} />
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
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shift name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <Label>End</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="text-xs text-gray-500">Duration: {getDuration() || '-'}</div>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


