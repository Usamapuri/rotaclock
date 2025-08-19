"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Clock,
  Calendar,
  LogOut,
  RefreshCw,
  Send,
  MessageSquare,
  Bell,
  CalendarDays,
  Users,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"

interface ShiftAssignment {
  id: string
  employee_id: string
  shift_id: string
  date: string
  shift_start_time: string
  shift_end_time: string
  status: 'assigned' | 'confirmed' | 'completed' | 'cancelled' | 'swap-requested'
  shift_name?: string
  shift_description?: string
}

interface SwapRequest {
  id: string
  requester_id: string
  target_id: string
  original_shift_id: string
  requested_shift_id: string
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  reason?: string
  admin_notes?: string
  created_at: string
  requester_first_name?: string
  requester_last_name?: string
  target_first_name?: string
  target_last_name?: string
  original_shift_date?: string
  original_shift_start_time?: string
  original_shift_end_time?: string
  requested_shift_date?: string
  requested_shift_start_time?: string
  requested_shift_end_time?: string
}

export default function EmployeeScheduling() {
  const [employeeId, setEmployeeId] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [weeklyShifts, setWeeklyShifts] = useState<ShiftAssignment[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [availableShifts, setAvailableShifts] = useState<ShiftAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Swap request dialog state
  const [showSwapDialog, setShowSwapDialog] = useState(false)
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<ShiftAssignment | null>(null)
  const [selectedTargetShift, setSelectedTargetShift] = useState<string>("")
  const [swapReason, setSwapReason] = useState("")
  const [submittingSwap, setSubmittingSwap] = useState(false)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user) {
      router.push("/employee/login")
    } else {
      setCurrentUser(user)
      setEmployeeId(user.id)
      loadData()
    }
  }, [router, selectedWeek])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load weekly shifts
      const weekStart = getWeekStart(selectedWeek)
      const weekEnd = getWeekEnd(selectedWeek)
      
      // Use the current user's ID (UUID) for filtering
      const employeeIdToUse = currentUser?.id || employeeId
      
      const shiftsResponse = await fetch(`/api/shifts/assignments?start_date=${weekStart}&end_date=${weekEnd}&employee_id=${employeeIdToUse}`)
      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json()
        if (shiftsData.data) {
          setWeeklyShifts(shiftsData.data)
        }
      }

      // Load available shifts for swapping (other employees' shifts in the same week)
      const availableResponse = await fetch(`/api/shifts/assignments?start_date=${weekStart}&end_date=${weekEnd}`)
      if (availableResponse.ok) {
        const availableData = await availableResponse.json()
        if (availableData.data) {
          // Filter out current employee's shifts and only show confirmed shifts
          const filtered = availableData.data.filter((shift: ShiftAssignment) => 
            shift.employee_id !== employeeId && shift.status === 'confirmed'
          )
          setAvailableShifts(filtered)
        }
      }

      // Load swap requests
      const swapResponse = await fetch(`/api/shifts/swap-requests?requester_id=${employeeId}`)
      if (swapResponse.ok) {
        const swapData = await swapResponse.json()
        if (swapData.data) {
          setSwapRequests(swapData.data)
        }
      }

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load schedule data')
    } finally {
      setLoading(false)
    }
  }

  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  const getWeekEnd = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? 0 : 7)
    const sunday = new Date(d.setDate(diff))
    return sunday.toISOString().split('T')[0]
  }

  const handlePreviousWeek = () => {
    const newDate = new Date(selectedWeek)
    newDate.setDate(newDate.getDate() - 7)
    setSelectedWeek(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(selectedWeek)
    newDate.setDate(newDate.getDate() + 7)
    setSelectedWeek(newDate)
  }

  const handleSwapRequest = (shift: ShiftAssignment) => {
    setSelectedShiftForSwap(shift)
    setShowSwapDialog(true)
  }

  const handleSwapSubmit = async () => {
    if (!selectedShiftForSwap || !selectedTargetShift || !swapReason.trim()) {
      toast.error('Please select a target shift and provide a reason')
      return
    }

    try {
      setSubmittingSwap(true)
      
      const response = await fetch('/api/shifts/swap-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requester_id: employeeId,
          target_id: availableShifts.find(s => s.id === selectedTargetShift)?.employee_id,
          original_shift_id: selectedShiftForSwap.id,
          requested_shift_id: selectedTargetShift,
          reason: swapReason
        })
      })

      if (response.ok) {
        toast.success('Swap request submitted successfully')
        setShowSwapDialog(false)
        setSelectedShiftForSwap(null)
        setSelectedTargetShift("")
        setSwapReason("")
        loadData() // Refresh data
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit swap request')
      }
    } catch (error) {
      console.error('Error submitting swap request:', error)
      toast.error('Failed to submit swap request')
    } finally {
      setSubmittingSwap(false)
    }
  }

  const handleLogout = () => {
    AuthService.logout()
    router.push("/employee/login")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="outline">Assigned</Badge>
      case 'confirmed':
        return <Badge variant="default">Confirmed</Badge>
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      case 'swap-requested':
        return <Badge variant="outline" className="text-orange-600">Swap Requested</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSwapStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600">Pending</Badge>
      case 'approved':
        return <Badge variant="default" className="text-green-600">Approved</Badge>
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getDayShifts = (date: string) => {
    return weeklyShifts.filter(shift => {
      // Convert shift.date (ISO format) to YYYY-MM-DD format for comparison
      const shiftDate = new Date(shift.date).toISOString().split('T')[0]
      return shiftDate === date
    })
  }

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading schedule...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/employee/dashboard">
                <div className="flex items-center">
                  <Calendar className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="text-xl font-bold text-gray-900">Employee Scheduling</span>
                </div>
              </Link>
              <Badge variant="outline">Manage your shifts and requests</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {currentUser?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous Week
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-semibold">
              Week of {formatDate(getWeekStart(selectedWeek))} - {formatDate(getWeekEnd(selectedWeek))}
            </h2>
            <p className="text-sm text-gray-600">Your weekly schedule</p>
          </div>
          <Button variant="outline" onClick={handleNextWeek}>
            Next Week
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule">My Schedule</TabsTrigger>
            <TabsTrigger value="swap-requests">Swap Requests</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* My Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2" />
                  Weekly Schedule
                </CardTitle>
                <CardDescription>View and manage your shifts for this week</CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyShifts.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No shifts scheduled for this week</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {weekDays.map((day, index) => {
                      const dayDate = new Date(getWeekStart(selectedWeek))
                      dayDate.setDate(dayDate.getDate() + index)
                      const dateString = dayDate.toISOString().split('T')[0]
                      const dayShifts = getDayShifts(dateString)
                      
                      return (
                        <div key={day} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">{day}</h3>
                            <span className="text-sm text-gray-500">{formatDate(dateString)}</span>
                          </div>
                          
                          {dayShifts.length === 0 ? (
                            <p className="text-gray-500 text-sm">No shifts scheduled</p>
                          ) : (
                            <div className="space-y-2">
                              {dayShifts.map((shift) => (
                                <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">{shift.shift_name || 'Scheduled Shift'}</span>
                                      {getStatusBadge(shift.status)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {formatTime(shift.shift_start_time)} - {formatTime(shift.shift_end_time)}
                                    </div>
                                  </div>
                                  
                                  {shift.status === 'confirmed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSwapRequest(shift)}
                                      className="ml-2"
                                    >
                                      <ArrowLeftRight className="h-4 w-4 mr-1" />
                                      Request Swap
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Swap Requests Tab */}
          <TabsContent value="swap-requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowLeftRight className="h-5 w-5 mr-2" />
                  My Swap Requests
                </CardTitle>
                <CardDescription>Track the status of your shift swap requests</CardDescription>
              </CardHeader>
              <CardContent>
                {swapRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <ArrowLeftRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No swap requests found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {swapRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Swap Request</span>
                            {getSwapStatusBadge(request.status)}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-700">Your Shift:</p>
                            <p className="text-gray-600">
                              {formatDate(request.original_shift_date || '')} - {formatTime(request.original_shift_start_time || '')} to {formatTime(request.original_shift_end_time || '')}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Requested Shift:</p>
                            <p className="text-gray-600">
                              {formatDate(request.requested_shift_date || '')} - {formatTime(request.requested_shift_start_time || '')} to {formatTime(request.requested_shift_end_time || '')}
                            </p>
                          </div>
                        </div>
                        
                        {request.reason && (
                          <div className="mt-3">
                            <p className="font-medium text-gray-700">Reason:</p>
                            <p className="text-gray-600">{request.reason}</p>
                          </div>
                        )}
                        
                        {request.admin_notes && (
                          <div className="mt-3">
                            <p className="font-medium text-gray-700">Admin Notes:</p>
                            <p className="text-gray-600">{request.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notifications
                </CardTitle>
                <CardDescription>Stay updated with schedule changes and announcements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No notifications at this time</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Swap Request Dialog */}
      <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Shift Swap</DialogTitle>
            <DialogDescription>
              Select a shift to swap with and provide a reason for your request.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="target-shift">Select Target Shift</Label>
              <Select value={selectedTargetShift} onValueChange={setSelectedTargetShift}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shift to swap with" />
                </SelectTrigger>
                <SelectContent>
                  {availableShifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {formatDate(shift.date)} - {formatTime(shift.start_time)} to {formatTime(shift.end_time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="reason">Reason for Swap</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a reason for requesting this swap..."
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSwapDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSwapSubmit} 
                disabled={submittingSwap || !selectedTargetShift || !swapReason.trim()}
              >
                {submittingSwap ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
