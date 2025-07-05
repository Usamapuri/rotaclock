"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
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
  Input,
  Label,
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
    required_staff: '',
    hourly_rate: ''
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
    setIsLoading(true)
    try {
      // Fetch shift templates from API
      const shiftsResponse = await fetch('/api/shifts/templates')
      if (!shiftsResponse.ok) {
        throw new Error('Failed to fetch shift templates')
      }
      const shiftsData = await shiftsResponse.json()
      setShifts(shiftsData.shifts || [])

      // Fetch shift assignments from API
      const assignmentsResponse = await fetch('/api/shifts/assignments')
      if (!assignmentsResponse.ok) {
        throw new Error('Failed to fetch shift assignments')
      }
      const assignmentsData = await assignmentsResponse.json()
      
      // Transform the API response to match our interface
      const transformedAssignments: ShiftAssignment[] = assignmentsData.assignments.map((assignment: any) => ({
        id: assignment.id,
        shift_id: assignment.shift_id,
        shift_name: assignment.shift?.name || 'Unknown Shift',
        employee_id: assignment.employee_id,
        employee_name: assignment.employee ? `${assignment.employee.first_name} ${assignment.employee.last_name}` : 'Unknown Employee',
        date: assignment.date,
        start_time: assignment.start_time,
        end_time: assignment.end_time,
        status: assignment.status
      }))
      
      setShiftAssignments(transformedAssignments)

      // Fetch employees for assignment form
      const employeesResponse = await fetch('/api/employees?is_active=true')
      if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employees')
      }
      const employeesData = await employeesResponse.json()
      setEmployees(employeesData.data || [])
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

  const handleSwapRequest = (requestId: string, action: "approve" | "deny") => {
    setSwapRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? { ...request, status: action === "approve" ? "approved" : "denied" } : request,
      ),
    )
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
    setIsLoading(true)
    try {
      // 1. Create the shift
      const shiftRes = await fetch('/api/shifts/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftFormData)
      })
      if (!shiftRes.ok) throw new Error('Failed to create shift')
      const shiftData = await shiftRes.json()
      const newShiftId = shiftData.shift?.id
      // 2. Assign shift to selected employees
      for (const empId of selectedEmployeeIds) {
        await fetch('/api/shifts/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shift_id: newShiftId,
            employee_id: empId,
            date: selectedDate,
            start_time: shiftFormData.start_time,
            end_time: shiftFormData.end_time
          })
        })
      }
      toast.success('Shift created and assigned!')
      setShowAddShift(false)
      setShiftFormData({ name: '', description: '', start_time: '', end_time: '', department: '', required_staff: '', hourly_rate: '' })
      setSelectedEmployeeIds([])
      await loadSchedulingData()
    } catch (err) {
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
  }

  const handleAssignmentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!assignmentFormData.shift_id || !assignmentFormData.employee_id || !assignmentFormData.date) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/shifts/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: assignmentFormData.employee_id,
          shift_id: assignmentFormData.shift_id,
          date: assignmentFormData.date,
          notes: assignmentFormData.notes || undefined,
          status: 'assigned'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign shift')
      }

      const { assignment } = await response.json()
      
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
    } catch (error) {
      console.error('Error assigning shift:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to assign shift')
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
                          <h4 className="font-semibold">{employee.name}</h4>
                          <p className="text-sm text-gray-600">{employee.department}</p>
                          <p className="text-sm text-gray-600">Max Hours: {employee.maxHoursPerWeek}/week</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>

                      <div className="grid grid-cols-7 gap-2 text-sm">
                        {Object.entries(employee.availability).map(([day, avail]) => (
                          <div key={day} className="text-center">
                            <p className="font-medium capitalize mb-1">{day.slice(0, 3)}</p>
                            <div
                              className={`p-2 rounded ${
                                avail.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {avail.available ? `${avail.start}-${avail.end}` : "Unavailable"}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Shift Preferences:</p>
                        <div className="flex space-x-2">
                          {employee.shiftPreferences.map((pref) => (
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
                            Vacation: {employees.find((e) => e.id === request.employeeId)?.leaveBalance.vacation || 0}
                          </span>
                          <span>
                            Sick: {employees.find((e) => e.id === request.employeeId)?.leaveBalance.sick || 0}
                          </span>
                          <span>
                            Personal: {employees.find((e) => e.id === request.employeeId)?.leaveBalance.personal || 0}
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
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input type="text" className="w-full border rounded px-3 py-2" value={shiftFormData.department} onChange={e => setShiftFormData({ ...shiftFormData, department: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign Employees</label>
                <select multiple className="w-full border rounded px-3 py-2 h-32" value={selectedEmployeeIds} onChange={e => setSelectedEmployeeIds(Array.from(e.target.selectedOptions, option => option.value))} required>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                  ))}
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
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} - {employee.department || 'No Department'}
                      </option>
                    ))}
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
