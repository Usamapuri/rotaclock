"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  department?: string
  job_position?: string
  location_id?: string
  notes?: string
  hourly_rate?: number
  max_hours_per_week?: number
}

interface Location {
  id: string
  name: string
}

interface EmployeeEditModalProps {
  isOpen: boolean
  onClose: () => void
  employee: Employee | null
  locations: Location[]
  onEmployeeUpdated: () => void
}

export default function EmployeeEditModal({
  isOpen,
  onClose,
  employee,
  locations,
  onEmployeeUpdated
}: EmployeeEditModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Employee>>({})

  useEffect(() => {
    if (employee) {
      setFormData({
        department: employee.department || '',
        job_position: employee.job_position || '',
        location_id: employee.location_id || '',
        notes: employee.notes || '',
        hourly_rate: employee.hourly_rate || 0,
        max_hours_per_week: employee.max_hours_per_week || 40
      })
    }
  }, [employee])

  const handleChange = (field: keyof Employee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/manager/employees/${employee.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update employee')
      }

      toast.success('Employee updated successfully')
      onEmployeeUpdated()
      onClose()
    } catch (error: any) {
      console.error('Error updating employee:', error)
      toast.error(error.message || 'Failed to update employee')
    } finally {
      setIsLoading(false)
    }
  }

  if (!employee) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update details for {employee.first_name} {employee.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="e.g. Sales"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_position">Job Position</Label>
              <Input
                id="job_position"
                value={formData.job_position}
                onChange={(e) => handleChange('job_position', e.target.value)}
                placeholder="e.g. Sales Representative"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select
              value={formData.location_id}
              onValueChange={(value) => handleChange('location_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate (£)</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourly_rate}
                onChange={(e) => handleChange('hourly_rate', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_hours">Max Hours / Week</Label>
              <Input
                id="max_hours"
                type="number"
                min="0"
                value={formData.max_hours_per_week}
                onChange={(e) => handleChange('max_hours_per_week', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Internal notes about this employee..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
