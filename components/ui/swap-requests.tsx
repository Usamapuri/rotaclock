"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Clock, User, ArrowRight, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { AuthService } from '@/lib/auth'

interface SwapRequest {
  id: string
  requester_id: string
  requester_name: string
  requested_shift_id: string
  requested_shift_date: string
  requested_shift_time: string
  offered_shift_id: string
  offered_shift_date: string
  offered_shift_time: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface Shift {
  id: string
  name: string
  date: string
  start_time: string
  end_time: string
  employee_id: string
}

export function SwapRequests() {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [myShifts, setMyShifts] = useState<Shift[]>([])
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedOfferedShift, setSelectedOfferedShift] = useState('')
  const [selectedRequestedShift, setSelectedRequestedShift] = useState('')
  const [reason, setReason] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (user) {
      setCurrentUser(user)
      loadData()
    }
  }, [])

  const loadData = async () => {
    try {
      setIsLoadingData(true)
      const user = AuthService.getCurrentUser()
      if (!user) return

      // Load swap requests
      const requestsResponse = await fetch('/api/onboarding/swap-requests')
      if (requestsResponse.ok) {
        const requests = await requestsResponse.json()
        setSwapRequests(requests)
      }

      // Load my shifts
      const myShiftsResponse = await fetch(`/api/shifts?employee_id=${user.id}`)
      if (myShiftsResponse.ok) {
        const shifts = await myShiftsResponse.json()
        setMyShifts(shifts)
      }

      // Load available shifts (shifts assigned to other employees)
      const availableResponse = await fetch('/api/shifts')
      if (availableResponse.ok) {
        const allShifts = await availableResponse.json()
        const available = allShifts.filter((shift: Shift) => shift.employee_id !== user.id)
        setAvailableShifts(available)
      }
    } catch (error) {
      console.error('Error loading swap request data:', error)
      toast.error('Failed to load data')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleCreateRequest = async () => {
    if (!selectedOfferedShift || !selectedRequestedShift || !reason) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/onboarding/swap-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requester_id: currentUser.id,
          offered_shift_id: selectedOfferedShift,
          requested_shift_id: selectedRequestedShift,
          reason,
        }),
      })

      if (response.ok) {
        const newRequest = await response.json()
        setSwapRequests(prev => [newRequest, ...prev])
        setShowCreateDialog(false)
        setSelectedOfferedShift('')
        setSelectedRequestedShift('')
        setReason('')
        toast.success('Swap request created successfully!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create swap request')
      }
    } catch (error) {
      console.error('Error creating swap request:', error)
      toast.error('Failed to create swap request')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/onboarding/swap-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
        }),
      })

      if (response.ok) {
        setSwapRequests(prev => 
          prev.map(req => 
            req.id === requestId ? { ...req, status: 'approved' as const } : req
          )
        )
        toast.success('Swap request approved!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to approve request')
      }
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error('Failed to approve request')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/onboarding/swap-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
        }),
      })

      if (response.ok) {
        setSwapRequests(prev => 
          prev.map(req => 
            req.id === requestId ? { ...req, status: 'rejected' as const } : req
          )
        )
        toast.success('Swap request rejected')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to reject request')
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error('Failed to reject request')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'approved':
        return <Badge variant="default">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatShiftTime = (shift: Shift) => {
    return `${shift.start_time} - ${shift.end_time}`
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading swap requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Swap Requests</h2>
          <p className="text-gray-600">Request to swap shifts with other employees</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>Create Swap Request</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Swap Request</DialogTitle>
              <DialogDescription>
                Offer one of your shifts in exchange for another employee's shift
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="offered-shift">Your Shift (Offering)</Label>
                  <Select value={selectedOfferedShift} onValueChange={setSelectedOfferedShift}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {myShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.name} - {shift.date} ({formatShiftTime(shift)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="requested-shift">Requested Shift</Label>
                  <Select value={selectedRequestedShift} onValueChange={setSelectedRequestedShift}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select desired shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.name} - {shift.date} ({formatShiftTime(shift)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="reason">Reason for Swap</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you want to swap shifts..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRequest} disabled={isLoading}>
                  Create Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Swap Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>My Swap Requests</CardTitle>
          <CardDescription>
            View and manage your shift swap requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {swapRequests.length > 0 ? (
            <div className="space-y-4">
              {swapRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{request.requester_name}</span>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm font-medium text-gray-700">Offering</p>
                      <p className="text-sm text-gray-600">{request.offered_shift_date}</p>
                      <p className="text-sm text-gray-600">{request.offered_shift_time}</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm font-medium text-blue-700">Requesting</p>
                      <p className="text-sm text-blue-600">{request.requested_shift_date}</p>
                      <p className="text-sm text-blue-600">{request.requested_shift_time}</p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm text-gray-600">
                      <strong>Reason:</strong> {request.reason}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Created: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    {request.status === 'pending' && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveRequest(request.id)}
                          disabled={isLoading}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectRequest(request.id)}
                          disabled={isLoading}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No swap requests found</p>
              <p className="text-sm text-gray-500">Create a new request to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 