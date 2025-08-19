"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Clock,
  Users,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Bell,
  CalendarDays,
  Zap,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Filter,
  Download,
  Calendar,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"

interface Employee {
  id: string
  name: string
  email: string
  department: string
  hourlyRate: number
  maxHoursPerWeek: number
  availability: {
    [key: string]: { start: string; end: string; available: boolean }
  }
  shiftPreferences: string[]
  leaveBalance: {
    vacation: number
    sick: number
    personal: number
  }
}

interface Shift {
  id: string
  name: string
  description: string
  start_time: string
  end_time: string
  department: string
  required_staff: number
  hourly_rate: number
  color: string
  is_active: boolean
}

interface ShiftAssignment {
  id: string
  shift_id: string
  shift_name: string
  employee_id: string
  employee_name: string
  date: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
}

interface Schedule {
  id: string
  employeeId: string
  employeeName: string
  shiftId: string
  shiftName: string
  date: string
  startTime: string
  endTime: string
  status: "scheduled" | "confirmed" | "swap-requested" | "completed"
  swapRequestId?: string
}

interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  type: "vacation" | "sick" | "personal"
  startDate: string
  endDate: string
  days: number
  reason: string
  status: "pending" | "approved" | "denied"
  submittedAt: string
}

interface SwapRequest {
  id: string
  requesterId: string
  requesterName: string
  targetId: string
  targetName: string
  originalShift: {
    date: string
    shiftName: string
    time: string
  }
  targetShift: {
    date: string
    shiftName: string
    time: string
  }
  reason: string
  status: "pending" | "approved" | "denied"
  submittedAt: string
}

export default function AdminScheduling() {
  const [adminUser, setAdminUser] = useState("")
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showAddShift, setShowAddShift] = useState(false)
  const [showAssignShift, setShowAssignShift] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [assignmentFormData, setAssignmentFormData] = useState({
    shift_id: '',
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [shiftFormData, setShiftFormData] = useState({
    name: '',
    description: '',
    start_time: '',
    end_time: '',
    department: '',
    required_staff: 1,
    hourly_rate: 15.00,
    color: '#3B82F6',
    is_active: true
  })
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const router = useRouter()

  // Sample data for fallback
  const sampleEmployees: Employee[] = [
    {
      id: "001",
      name: "John Doe",
      email: "john@company.com",
      department: "Sales",
      hourlyRate: 15.5,
      maxHoursPerWeek: 40,
      availability: {
        monday: { start: "09:00", end: "17:00", available: true },
        tuesday: { start: "09:00", end: "17:00", available: true },
        wednesday: { start: "09:00", end: "17:00", available: true },
        thursday: { start: "09:00", end: "17:00", available: true },
        friday: { start: "09:00", end: "17:00", available: true },
        saturday: { start: "10:00", end: "14:00", available: false },
        sunday: { start: "10:00", end: "14:00", available: false },
      },
      shiftPreferences: ["morning", "day"],
      leaveBalance: { vacation: 15, sick: 5, personal: 3 },
    },
    {
      id: "002",
      name: "Jane Smith",
      email: "jane@company.com",
      department: "Support",
      hourlyRate: 18.0,
      maxHoursPerWeek: 35,
      availability: {
        monday: { start: "10:00", end: "18:00", available: true },
        tuesday: { start: "10:00", end: "18:00", available: true },
        wednesday: { start: "10:00", end: "18:00", available: true },
        thursday: { start: "10:00", end: "18:00", available: true },
        friday: { start: "10:00", end: "18:00", available: true },
        saturday: { start: "09:00", end: "15:00", available: true },
        sunday: { start: "09:00", end: "15:00", available: false },
      },
      shiftPreferences: ["day", "evening"],
      leaveBalance: { vacation: 12, sick: 8, personal: 2 },
    },
  ]

  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: "1",
      employeeId: "001",
      employeeName: "John Doe",
      shiftId: "day",
      shiftName: "Day Shift",
      date: "2024-01-08",
      startTime: "09:00",
      endTime: "17:00",
      status: "scheduled",
    },
    {
      id: "2",
      employeeId: "002",
      employeeName: "Jane Smith",
      shiftId: "evening",
      shiftName: "Evening Shift",
      date: "2024-01-08",
      startTime: "14:00",
      endTime: "22:00",
      status: "confirmed",
    },
  ])

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: "1",
      employeeId: "001",
      employeeName: "John Doe",
      type: "vacation",
      startDate: "2024-01-15",
      endDate: "2024-01-17",
      days: 3,
      reason: "Family vacation",
      status: "pending",
      submittedAt: "2024-01-10T10:00:00Z",
    },
    {
      id: "2",
      employeeId: "002",
      employeeName: "Jane Smith",
      type: "sick",
      startDate: "2024-01-12",
      endDate: "2024-01-12",
      days: 1,
      reason: "Medical appointment",
      status: "approved",
      submittedAt: "2024-01-11T14:30:00Z",
    },
  ])

  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([
    {
      id: "1",
      requesterId: "001",
      requesterName: "John Doe",
      targetId: "002",
      targetName: "Jane Smith",
      originalShift: {
        date: "2024-01-10",
        shiftName: "Day Shift",
        time: "09:00-17:00",
      },
      targetShift: {
        date: "2024-01-11",
        shiftName: "Evening Shift",
        time: "14:00-22:00",
      },
      reason: "Personal appointment",
      status: "pending",
      submittedAt: "2024-01-09T16:00:00Z",
    },
  ])

  const [holidays, setHolidays] = useState([
    { date: "2024-01-01", name: "New Year's Day" },
    { date: "2024-07-04", name: "Independence Day" },
    { date: "2024-12-25", name: "Christmas Day" },
  ])

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'admin') {
      router.push('/admin/login')
      return
    }
    setCurrentUser(user)
    loadSchedulingData()
  }, [router])

  const loadSchedulingData = async () => {
    try {
      setIsLoading(true)
      
      // Load employees
      const employeesResponse = await fetch('/api/employees')
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json()
        if (employeesData.data) {
          const transformedEmployees = employeesData.data.map((emp: any) => ({
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            email: emp.email,
            department: emp.department || 'General',
            hourlyRate: emp.hourly_rate || 15,
            maxHoursPerWeek: emp.max_hours_per_week || 40,
            availability: {},
            shiftPreferences: [],
            leaveBalance: { vacation: 15, sick: 5, personal: 3 }
          }))
          setEmployees(transformedEmployees)
          console.log(`📊 Loaded ${transformedEmployees.length} employees for scheduling`)
        }
      }

      // Load shifts
      const shiftsResponse = await fetch('/api/shifts/templates')
      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json()
        if (shiftsData.shifts) {
          setShifts(shiftsData.shifts)
        }
      }

      // Load shift assignments
      const assignmentsResponse = await fetch('/api/shifts/assignments')
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json()
        if (assignmentsData.data) {
          setShiftAssignments(assignmentsData.data)
        }
      }

      // Load swap requests from API
      const swapRequestsResponse = await fetch('/api/shifts/swap-requests')
      if (swapRequestsResponse.ok) {
        const swapRequestsData = await swapRequestsResponse.json()
        if (swapRequestsData.data) {
          setSwapRequests(swapRequestsData.data.map((swap: any) => ({
            id: swap.id,
            requesterId: swap.requester_id,
            requesterName: `${swap.requester_first_name} ${swap.requester_last_name}`,
            targetId: swap.target_id,
            targetName: `${swap.target_first_name} ${swap.target_last_name}`,
            originalShift: {
              date: swap.original_shift_date || '',
              shiftName: 'Scheduled Shift',
              time: `${swap.original_shift_start_time || ''} - ${swap.original_shift_end_time || ''}`
            },
            targetShift: {
              date: swap.requested_shift_date || '',
              shiftName: 'Scheduled Shift',
              time: `${swap.requested_shift_start_time || ''} - ${swap.requested_shift_end_time || ''}`
            },
            reason: swap.reason || '',
            status: swap.status,
            submittedAt: swap.created_at
          })))
        }
      }

    } catch (error) {
      console.error('Error loading scheduling data:', error)
      toast.error('Failed to load scheduling data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("adminUser")
    router.push("/admin/login")
  }

  const handleAutoSchedule = () => {
    // Simulate auto-scheduling algorithm
    console.log("Running auto-schedule algorithm...")
    // In a real app, this would call an API to generate optimal schedules
    alert("Auto-scheduling completed! New schedules have been generated based on availability and preferences.")
  }

  const handleLeaveRequest = (requestId: string, action: "approve" | "deny") => {
    setLeaveRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? { ...request, status: action === "approve" ? "approved" : "denied" } : request,
      ),
    )
  }

  const handleSwapRequest = async (requestId: string, action: "approve" | "deny") => {
    try {
      const response = await fetch(`/api/shifts/swap-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action === "approve" ? "approved" : "denied",
          admin_notes: action === "approve" ? "Swap request approved" : "Swap request denied"
        })
      })

      if (response.ok) {
        // Update local state
        setSwapRequests((prev) =>
          prev.map((request) =>
            request.id === requestId ? { ...request, status: action === "approve" ? "approved" : "denied" } : request,
          ),
        )
        
        toast.success(`Swap request ${action === "approve" ? "approved" : "denied"} successfully`)
        
        // Reload data to get updated information
        loadSchedulingData()
      } else {
        const error = await response.json()
        toast.error(error.error || `Failed to ${action} swap request`)
      }
    } catch (error) {
      console.error(`Error ${action}ing swap request:`, error)
      toast.error(`Failed to ${action} swap request`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "default"
      case "denied":
        return "destructive"
      case "pending":
        return "secondary"
      case "confirmed":
        return "default"
      case "swap-requested":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>
      case 'in-progress':
        return <Badge variant="default">In Progress</Badge>
      case 'completed':
        return <Badge variant="outline">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getAssignmentsForDate = (date: string) => {
    return shiftAssignments.filter(assignment => assignment.date === date)
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const handleShiftFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!shiftFormData.name || !shiftFormData.start_time || !shiftFormData.end_time) {
      toast.error('Please fill in all required fields (Name, Start Time, End Time)')
      return
    }
    
    // Validate time logic
    if (shiftFormData.start_time >= shiftFormData.end_time) {
      toast.error('End time must be after start time')
      return
    }
    
    setIsLoading(true)
    try {
      // Ensure proper data types for API validation
      const apiData = {
        ...shiftFormData,
        required_staff: Number(shiftFormData.required_staff),
        hourly_rate: Number(shiftFormData.hourly_rate),
        is_active: Boolean(shiftFormData.is_active)
      }
      
      console.log('Submitting shift form data:', apiData)
      
      // 1. Create the shift template
      const shiftRes = await fetch('/api/shifts/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      })
      
      console.log('Shift creation response status:', shiftRes.status)
      
      if (!shiftRes.ok) {
        const errorData = await shiftRes.json()
        console.error('Shift creation error response:', errorData)
        throw new Error(errorData.error || 'Failed to create shift')
      }
      
      const shiftData = await shiftRes.json()
      console.log('Shift creation success response:', shiftData)
      const newShiftId = shiftData.shift?.id
      
      if (!newShiftId) {
        throw new Error('Failed to get shift ID from response')
      }
      
      // 2. Assign shift to selected employees
      for (const empId of selectedEmployeeIds) {
        const assignmentRes = await fetch('/api/shifts/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shift_id: newShiftId,
            employee_id: empId,
            date: selectedDate,
            start_time: shiftFormData.start_time,
            end_time: shiftFormData.end_time,
            status: 'assigned'
          })
        })
        
        if (!assignmentRes.ok) {
          console.error(`Failed to assign shift to employee ${empId}`)
        }
      }
      
      toast.success('Shift created and assigned!')
      setShowAddShift(false)
      setShiftFormData({ 
        name: '', 
        description: '', 
        start_time: '', 
        end_time: '', 
        department: '', 
        required_staff: 1, 
        hourly_rate: 15.00,
        color: '#3B82F6',
        is_active: true
      })
      setSelectedEmployeeIds([])
      setSelectedDate(new Date().toISOString().split('T')[0])
      await loadSchedulingData()
    } catch (err) {
      console.error('Error creating shift:', err)
      toast.error('Failed to create shift')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShiftInputChange = (field: string, value: string) => {
    setShiftFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAssignmentInputChange = (field: string, value: string) => {
    setAssignmentFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Check for conflicts when employee or date changes
    if (field === 'employee_id' || field === 'date') {
      const newData = { ...assignmentFormData, [field]: value }
      if (newData.employee_id && newData.date) {
        const existingAssignment = shiftAssignments.find(
          assignment => 
            assignment.employee_id === newData.employee_id && 
            assignment.date === newData.date &&
            assignment.status !== 'cancelled'
        )
        
        if (existingAssignment) {
          toast.warning(`This employee already has an assignment on ${newData.date}`)
        }
      }
    }
  }

  const handleAssignmentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!assignmentFormData.shift_id || !assignmentFormData.employee_id || !assignmentFormData.date) {
      toast.error('Please fill in all required fields')
      return
    }

    // Check if employee already has an assignment on this date in local state
    const existingAssignment = shiftAssignments.find(
      assignment => 
        assignment.employee_id === assignmentFormData.employee_id && 
        assignment.date === assignmentFormData.date &&
        assignment.status !== 'cancelled'
    )
    
    if (existingAssignment) {
      toast.error(`Employee already has an assignment on ${assignmentFormData.date}. Please select a different date or employee.`)
      return
    }

    try {
      const requestBody = {
        employee_id: assignmentFormData.employee_id,
        shift_id: assignmentFormData.shift_id,
        date: assignmentFormData.date,
        notes: assignmentFormData.notes || undefined,
        status: 'assigned'
      }
      
      const response = await fetch('/api/shifts/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        // If it's a conflict error (409), show the specific message
        if (response.status === 409) {
          throw new Error(errorData.error || 'Employee already has an assignment on this date')
        }
        throw new Error(errorData.error || 'Failed to assign shift')
      }

      const responseData = await response.json()
      
      // Check if assignment was created successfully
      if (!responseData.data) {
        throw new Error('Failed to create assignment - no assignment data returned')
      }
      
      const assignment = responseData.data
      
      // Add the new assignment to the local state
      const newAssignment: ShiftAssignment = {
        id: assignment.id,
        shift_id: assignment.shift_id,
        shift_name: assignment.shift?.name || 'Unknown Shift',
        employee_id: assignment.employee_id,
        employee_name: assignment.employee ? `${assignment.employee.first_name} ${assignment.employee.last_name}` : 'Unknown Employee',
        date: assignment.date,
        start_time: assignment.start_time,
        end_time: assignment.end_time,
        status: assignment.status
      }
      
      setShiftAssignments([...shiftAssignments, newAssignment])
      setShowAssignShift(false)
      
      // Reset form
      setAssignmentFormData({
        shift_id: '',
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      })
      
      toast.success('Shift assigned successfully!')
      
      // Refresh assignments data to ensure we have the latest information
      await loadSchedulingData()
    } catch (error) {
      console.error('Error assigning shift:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign shift'
      
      // Provide more specific error messages
      if (errorMessage.includes('already has an assignment')) {
        toast.error('This employee already has a shift assigned on this date. Please select a different date or employee.')
      } else if (errorMessage.includes('Employee not found')) {
        toast.error('Selected employee not found. Please refresh the page and try again.')
      } else if (errorMessage.includes('Shift not found')) {
        toast.error('Selected shift not found. Please refresh the page and try again.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => router.push('/admin/dashboard')} 
                variant="ghost" 
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="bg-purple-100 p-2 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Shift Scheduling
                </h1>
                <p className="text-sm text-gray-500">
                  Manage employee shifts and schedules
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Schedule
              </Button>
              <Button onClick={() => setShowAssignShift(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Assign Shift
              </Button>
              <Button onClick={() => setShowAddShift(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Shift
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Auto-Schedule</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Switch checked={autoScheduleEnabled} onCheckedChange={setAutoScheduleEnabled} />
                    <span className="text-sm">{autoScheduleEnabled ? "Enabled" : "Disabled"}</span>
                  </div>
                </div>
                <Zap className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold">{leaveRequests.filter((r) => r.status === "pending").length}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Swap Requests</p>
                  <p className="text-2xl font-bold">{swapRequests.filter((r) => r.status === "pending").length}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Shifts</p>
                  <p className="text-2xl font-bold">{schedules.filter((s) => s.status === "confirmed").length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Scheduling Interface */}
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="shifts">Shift Types</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="requests">Leave Requests</TabsTrigger>
            <TabsTrigger value="swaps">Shift Swaps</TabsTrigger>
            <TabsTrigger value="holidays">Holidays</TabsTrigger>
          </TabsList>

          {/* Schedule Management */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Weekly Schedule</h2>
              <div className="flex space-x-2">
                <Button onClick={handleAutoSchedule} disabled={!autoScheduleEnabled}>
                  <Zap className="h-4 w-4 mr-2" />
                  Auto-Schedule
                </Button>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shift
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Current Week Schedule</CardTitle>
                <CardDescription>Manage employee shifts and assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div
                          className="w-4 h-4 rounded"
                          style={{
                            backgroundColor: shifts.find((s) => s.id === schedule.shiftId)?.color || "#gray",
                          }}
                        />
                        <div>
                          <h4 className="font-semibold">{schedule.employeeName}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(schedule.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {schedule.shiftName} • {schedule.startTime} - {schedule.endTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {getStatusBadge(schedule.status)}
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shift Types */}
          <TabsContent value="shifts" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Shift Types</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Shift Type
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Manage Shift Types</CardTitle>
                <CardDescription>Configure different shift types and their requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: shift.color }} />
                        <div>
                          <h4 className="font-semibold">{shift.name}</h4>
                          <p className="text-sm text-gray-600">
                            {shift.start_time} - {shift.end_time} • {shift.department}
                          </p>
                          <p className="text-sm text-gray-600">Required Staff: {shift.required_staff}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employee Availability */}
          <TabsContent value="availability" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Employee Availability</h2>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Bulk Update
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Availability Overview</CardTitle>
                <CardDescription>View and manage employee availability and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {employees.map((employee) => (
                    <div key={employee.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold">{employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown Employee'}</h4>
                          <p className="text-sm text-gray-600">{employee.department || 'No Department'}</p>
                          <p className="text-sm text-gray-600">Max Hours: {employee.maxHoursPerWeek || 40}/week</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>

                      <div className="grid grid-cols-7 gap-2 text-sm">
                        {Object.entries(employee.availability || {}).map(([day, avail]) => {
                          const availability = avail as { start: string; end: string; available: boolean }
                          return (
                            <div key={day} className="text-center">
                              <p className="font-medium capitalize mb-1">{day.slice(0, 3)}</p>
                              <div
                                className={`p-2 rounded ${
                                  availability.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }`}
                              >
                                {availability.available ? `${availability.start}-${availability.end}` : "Unavailable"}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Shift Preferences:</p>
                        <div className="flex space-x-2">
                          {(employee.shiftPreferences || []).map((pref: string) => (
                            <Badge key={pref} variant="outline">
                              {pref}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Requests */}
          <TabsContent value="requests" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Leave Requests</h2>
              <Badge variant="secondary">{leaveRequests.filter((r) => r.status === "pending").length} Pending</Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Manage Leave Requests</CardTitle>
                <CardDescription>Review and approve employee time-off requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaveRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{request.employeeName}</h4>
                          <p className="text-sm text-gray-600 capitalize">{request.type} Leave</p>
                          <p className="text-sm text-gray-600">
                            {new Date(request.startDate).toLocaleDateString()} -{" "}
                            {new Date(request.endDate).toLocaleDateString()} ({request.days} days)
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium">Reason:</p>
                        <p className="text-sm text-gray-600">{request.reason}</p>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-600">
                          Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Leave Balance Info */}
                      <div className="mb-3 p-2 bg-gray-50 rounded">
                        <p className="text-sm font-medium mb-1">Current Leave Balance:</p>
                        <div className="flex space-x-4 text-sm">
                          <span>
                            Vacation: {employees.find((e) => e.id === request.employeeId)?.leaveBalance?.vacation || 0}
                          </span>
                          <span>
                            Sick: {employees.find((e) => e.id === request.employeeId)?.leaveBalance?.sick || 0}
                          </span>
                          <span>
                            Personal: {employees.find((e) => e.id === request.employeeId)?.leaveBalance?.personal || 0}
                          </span>
                        </div>
                      </div>

                      {request.status === "pending" && (
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => handleLeaveRequest(request.id, "approve")}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleLeaveRequest(request.id, "deny")}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Deny
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shift Swaps */}
          <TabsContent value="swaps" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Shift Swap Requests</h2>
              <Badge variant="secondary">{swapRequests.filter((r) => r.status === "pending").length} Pending</Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Manage Shift Swaps</CardTitle>
                <CardDescription>Review employee shift swap requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {swapRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">Shift Swap Request</h4>
                          <p className="text-sm text-gray-600">
                            {request.requesterName} ↔ {request.targetName}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-3">
                        <div className="p-3 bg-blue-50 rounded">
                          <p className="text-sm font-medium text-blue-900">{request.requesterName}'s Shift</p>
                          <p className="text-sm text-blue-700">
                            {new Date(request.originalShift.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-blue-700">
                            {request.originalShift.shiftName} • {request.originalShift.time}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <p className="text-sm font-medium text-green-900">{request.targetName}'s Shift</p>
                          <p className="text-sm text-green-700">
                            {new Date(request.targetShift.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-green-700">
                            {request.targetShift.shiftName} • {request.targetShift.time}
                          </p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium">Reason:</p>
                        <p className="text-sm text-gray-600">{request.reason}</p>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-600">
                          Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {request.status === "pending" && (
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => handleSwapRequest(request.id, "approve")}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Swap
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleSwapRequest(request.id, "deny")}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Deny Swap
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Holiday Management */}
          <TabsContent value="holidays" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Holiday Management</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Company Holidays</CardTitle>
                <CardDescription>Manage company holidays and blackout dates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {holidays.map((holiday, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <CalendarDays className="h-5 w-5 text-red-500" />
                        <div>
                          <h4 className="font-semibold">{holiday.name}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(holiday.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900">Holiday Scheduling Rules</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        No shifts will be automatically scheduled on company holidays. Existing shifts on holiday dates
                        will be flagged for review.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Shift Modal */}
      {showAddShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Create Shift</h2>
            <form onSubmit={handleShiftFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Shift Name</label>
                <input type="text" className="w-full border rounded px-3 py-2" value={shiftFormData.name} onChange={e => setShiftFormData({ ...shiftFormData, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="w-full border rounded px-3 py-2" value={shiftFormData.description} onChange={e => setShiftFormData({ ...shiftFormData, description: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input type="time" className="w-full border rounded px-3 py-2" value={shiftFormData.start_time} onChange={e => setShiftFormData({ ...shiftFormData, start_time: e.target.value })} required />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input type="time" className="w-full border rounded px-3 py-2" value={shiftFormData.end_time} onChange={e => setShiftFormData({ ...shiftFormData, end_time: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <input type="text" className="w-full border rounded px-3 py-2" value={shiftFormData.department} onChange={e => setShiftFormData({ ...shiftFormData, department: e.target.value })} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Required Staff</label>
                  <input type="number" min="1" className="w-full border rounded px-3 py-2" value={shiftFormData.required_staff} onChange={e => setShiftFormData({ ...shiftFormData, required_staff: parseInt(e.target.value) || 1 })} required />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Hourly Rate</label>
                  <input type="number" step="0.01" min="0" className="w-full border rounded px-3 py-2" value={shiftFormData.hourly_rate} onChange={e => setShiftFormData({ ...shiftFormData, hourly_rate: parseFloat(e.target.value) || 15.00 })} required />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Color</label>
                  <input type="color" className="w-full border rounded px-3 py-2 h-10" value={shiftFormData.color} onChange={e => setShiftFormData({ ...shiftFormData, color: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assignment Date</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign Employees</label>
                <select multiple className="w-full border rounded px-3 py-2 h-32" value={selectedEmployeeIds} onChange={e => setSelectedEmployeeIds(Array.from(e.target.selectedOptions, option => option.value))} required>
                  {employees.length > 0 ? (
                    employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))
                  ) : (
                    <option value="" disabled>No employees available. Please add employees first.</option>
                  )}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddShift(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Shift'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Shift Modal */}
      {showAssignShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Assign Shift</CardTitle>
              <CardDescription>Assign an employee to a shift</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignmentFormSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="shift_id">Shift</Label>
                  <select 
                    id="shift_id" 
                    className="w-full p-2 border rounded-md" 
                    value={assignmentFormData.shift_id}
                    onChange={(e) => handleAssignmentInputChange('shift_id', e.target.value)}
                    required
                  >

                    <option value="">Select Shift</option>
                    {shifts.filter(s => s.is_active).map(shift => (
                      <option key={shift.id} value={shift.id}>
                        {shift.name} ({formatTime(shift.start_time)} - {formatTime(shift.end_time)})
                      </option>
                    ))}
                    {shifts.length === 0 && (
                      <option value="" disabled>No shifts available</option>
                    )}
                    {shifts.filter(s => s.is_active).length === 0 && shifts.length > 0 && (
                      <option value="" disabled>No active shifts available</option>
                    )}
                  </select>
                </div>
                <div>
                  <Label htmlFor="employee_id">Employee</Label>
                  <select 
                    id="employee_id" 
                    className="w-full p-2 border rounded-md" 
                    value={assignmentFormData.employee_id}
                    onChange={(e) => handleAssignmentInputChange('employee_id', e.target.value)}
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.length > 0 ? (
                      employees.map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} - {employee.department || 'No Department'}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No employees available</option>
                    )}
                  </select>
                </div>
                <div>
                  <Label htmlFor="assignment_date">Date</Label>
                  <Input 
                    id="assignment_date" 
                    type="date" 
                    value={assignmentFormData.date}
                    onChange={(e) => handleAssignmentInputChange('date', e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="assignment_notes">Notes (Optional)</Label>
                  <Input 
                    id="assignment_notes" 
                    type="text"
                    placeholder="Add any notes about this assignment"
                    value={assignmentFormData.notes}
                    onChange={(e) => handleAssignmentInputChange('notes', e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Assign Shift
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAssignShift(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
