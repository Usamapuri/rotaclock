"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Phone, TrendingUp, FileText, Star } from 'lucide-react'

interface ShiftRemarksDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ShiftRemarksData) => void
  isLoading?: boolean
  shiftDuration?: string
  clockInTime?: string
}

export interface ShiftRemarksData {
  total_calls_taken: number
  leads_generated: number
  shift_remarks: string
  performance_rating: number
}

export function ShiftRemarksDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  shiftDuration,
  clockInTime
}: ShiftRemarksDialogProps) {
  const [formData, setFormData] = useState<ShiftRemarksData>({
    total_calls_taken: 0,
    leads_generated: 0,
    shift_remarks: '',
    performance_rating: 3
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleInputChange = (field: keyof ShiftRemarksData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getPerformanceLabel = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor'
      case 2: return 'Fair'
      case 3: return 'Good'
      case 4: return 'Very Good'
      case 5: return 'Excellent'
      default: return 'Good'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Shift Summary & Clock Out
          </DialogTitle>
          <DialogDescription>
            Please provide details about your shift before clocking out
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shift Summary Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">{shiftDuration || '0:00'}</div>
                  <div className="text-sm text-blue-700">Total Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-700">Started at</div>
                  <div className="font-medium text-blue-900">
                    {clockInTime ? new Date(clockInTime).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_calls_taken" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Total Calls Taken
              </Label>
              <Input
                id="total_calls_taken"
                type="number"
                min="0"
                value={formData.total_calls_taken}
                onChange={(e) => handleInputChange('total_calls_taken', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="text-center text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leads_generated" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Leads Generated
              </Label>
              <Input
                id="leads_generated"
                type="number"
                min="0"
                value={formData.leads_generated}
                onChange={(e) => handleInputChange('leads_generated', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="text-center text-lg font-semibold"
              />
            </div>
          </div>

          {/* Performance Rating */}
          <div className="space-y-2">
            <Label htmlFor="performance_rating" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Self Performance Rating
            </Label>
            <Select
              value={formData.performance_rating.toString()}
              onValueChange={(value) => handleInputChange('performance_rating', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Poor</SelectItem>
                <SelectItem value="2">2 - Fair</SelectItem>
                <SelectItem value="3">3 - Good</SelectItem>
                <SelectItem value="4">4 - Very Good</SelectItem>
                <SelectItem value="5">5 - Excellent</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {getPerformanceLabel(formData.performance_rating)}
              </Badge>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= formData.performance_rating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Shift Remarks */}
          <div className="space-y-2">
            <Label htmlFor="shift_remarks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Shift Remarks & Notes
            </Label>
            <Textarea
              id="shift_remarks"
              placeholder="Describe your shift, any challenges, achievements, or important notes..."
              value={formData.shift_remarks}
              onChange={(e) => handleInputChange('shift_remarks', e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="text-xs text-gray-500">
              Optional: Share details about your shift performance, challenges faced, or any important information
            </div>
          </div>

          {/* Summary */}
          <Card className="bg-gray-50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900">{formData.total_calls_taken}</div>
                  <div className="text-xs text-gray-600">Calls</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{formData.leads_generated}</div>
                  <div className="text-xs text-gray-600">Leads</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{formData.performance_rating}/5</div>
                  <div className="text-xs text-gray-600">Rating</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Clocking Out...' : 'Clock Out & Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
