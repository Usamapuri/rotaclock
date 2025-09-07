"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Copy, Clipboard, Calendar, Users, Clock } from 'lucide-react'
import { AuthService } from '@/lib/auth'
import { toast } from 'sonner'

interface Assignment {
  id: string
  employee_id: string
  shift_date: string
  shift_name?: string
  start_time?: string
  end_time?: string
  template_id?: string
  template_name?: string
  template_start_time?: string
  template_end_time?: string
  notes?: string
  is_published: boolean
  rota_id?: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  employee_code: string
}

interface CopiedShift {
  employee_id: string
  employee_name: string
  shift_name?: string
  start_time?: string
  end_time?: string
  template_id?: string
  template_name?: string
  template_start_time?: string
  template_end_time?: string
  notes?: string
}

interface ShiftCopyPasteProps {
  isOpen: boolean
  onClose: () => void
  copiedShifts: CopiedShift[]
  targetDate: string
  employees: Employee[]
  currentRotaId?: string
  onShiftsPasted: () => void
}

export default function ShiftCopyPaste({
  isOpen,
  onClose,
  copiedShifts,
  targetDate,
  employees,
  currentRotaId,
  onShiftsPasted
}: ShiftCopyPasteProps) {
  const [selectedShifts, setSelectedShifts] = useState<string[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [isPasting, setIsPasting] = useState(false)

  const handleShiftToggle = (employeeId: string) => {
    setSelectedShifts(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const selectAllShifts = () => {
    setSelectedShifts(copiedShifts.map(s => s.employee_id))
  }

  const selectAllEmployees = () => {
    setSelectedEmployees(employees.map(e => e.id))
  }

  const pasteShifts = async () => {
    if (selectedShifts.length === 0 || selectedEmployees.length === 0) {
      toast.error('Please select shifts to copy and employees to assign them to')
      return
    }

    try {
      setIsPasting(true)
      const user = AuthService.getCurrentUser()
      let successCount = 0
      let errorCount = 0

      for (const shiftEmployeeId of selectedShifts) {
        const shift = copiedShifts.find(s => s.employee_id === shiftEmployeeId)
        if (!shift) continue

        for (const targetEmployeeId of selectedEmployees) {
          try {
            const assignmentData = {
              employee_id: targetEmployeeId,
              shift_date: targetDate,
              shift_name: shift.shift_name,
              start_time: shift.start_time,
              end_time: shift.end_time,
              template_id: shift.template_id,
              notes: shift.notes,
              rota_id: currentRotaId
            }

            const response = await fetch('/api/scheduling/assign', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${user?.id}`
              },
              body: JSON.stringify(assignmentData)
            })

            if (response.ok) {
              successCount++
            } else {
              errorCount++
            }
          } catch (error) {
            console.error('Error pasting shift:', error)
            errorCount++
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully pasted ${successCount} shift${successCount > 1 ? 's' : ''}`)
        onShiftsPasted()
        onClose()
      }

      if (errorCount > 0) {
        toast.error(`Failed to paste ${errorCount} shift${errorCount > 1 ? 's' : ''}`)
      }
    } catch (error) {
      console.error('Error in paste operation:', error)
      toast.error('Failed to paste shifts')
    } finally {
      setIsPasting(false)
    }
  }

  const formatTime = (time?: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getShiftDisplay = (shift: CopiedShift) => {
    const name = shift.shift_name || shift.template_name || 'Shift'
    const startTime = shift.start_time || shift.template_start_time
    const endTime = shift.end_time || shift.template_end_time
    return { name, startTime, endTime }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clipboard className="h-5 w-5" />
            Paste Shifts
          </DialogTitle>
          <DialogDescription>
            Select shifts to copy and employees to assign them to for {new Date(targetDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        {copiedShifts.length === 0 ? (
          <div className="text-center py-12">
            <Copy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Copied Shifts</h3>
            <p className="text-gray-500">Copy some shifts first to paste them here</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Shifts to Copy */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Shifts to Copy ({copiedShifts.length})</h3>
                <Button variant="outline" size="sm" onClick={selectAllShifts}>
                  Select All
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {copiedShifts.map((shift) => {
                  const { name, startTime, endTime } = getShiftDisplay(shift)
                  return (
                    <Card
                      key={shift.employee_id}
                      className={`cursor-pointer transition-colors ${
                        selectedShifts.includes(shift.employee_id)
                          ? 'border-blue-300 bg-blue-50'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => handleShiftToggle(shift.employee_id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedShifts.includes(shift.employee_id)}
                            onChange={() => handleShiftToggle(shift.employee_id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{shift.employee_name}</span>
                              <Badge variant="outline" className="text-xs">{name}</Badge>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {startTime && endTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(startTime)} - {formatTime(endTime)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Target Employees */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Assign to Employees ({employees.length})</h3>
                <Button variant="outline" size="sm" onClick={selectAllEmployees}>
                  Select All
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {employees.map((employee) => (
                  <Card
                    key={employee.id}
                    className={`cursor-pointer transition-colors ${
                      selectedEmployees.includes(employee.id)
                        ? 'border-green-300 bg-green-50'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => handleEmployeeToggle(employee.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => handleEmployeeToggle(employee.id)}
                        />
                        <div>
                          <div className="font-medium text-sm">
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{employee.employee_code}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {copiedShifts.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedShifts.length} shift{selectedShifts.length !== 1 ? 's' : ''} × {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} = {selectedShifts.length * selectedEmployees.length} assignments
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={pasteShifts}
                disabled={isPasting || selectedShifts.length === 0 || selectedEmployees.length === 0}
              >
                {isPasting ? (
                  'Pasting...'
                ) : (
                  <>
                    <Clipboard className="h-4 w-4 mr-2" />
                    Paste Shifts
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
