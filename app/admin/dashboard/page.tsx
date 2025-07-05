"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Plus,
  LogOut,
  UserPlus,
  Settings,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Bell
} from 'lucide-react'
import { AuthService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  is_active: boolean
}

interface Shift {
  id: string
  name: string
  start_time: string
  end_time: string
  status: string
}

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

interface LeaveRequest {
  id: string
  employee_id: string
  employee_name: string
  leave_type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'other'
  start_date: string
  end_date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  totalShifts: number
  completedShifts: number
  weeklyHours: number
  avgHoursPerEmployee: number
  pendingSwapRequests: number
  pendingLeaveRequests: number
}

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalShifts: 0,
    completedShifts: 0,
    weeklyHours: 0,
    avgHoursPerEmployee: 0,
    pendingSwapRequests: 0,
    pendingLeaveRequests: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [broadcastToAll, setBroadcastToAll] = useState(true)
  
  const router = useRouter()

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'admin') {
      router.push('/admin/login')
      return
    }
    setCurrentUser(user)
    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    setIsLoadingData(true)
    try {
      // Load employees
      const employeesResponse = await fetch('/api/employees')
      let employeesData: any[] = []
      if (employeesResponse.ok) {
        const json = await employeesResponse.json()
        employeesData = json.data || json.employees || json || []
        setEmployees(employeesData)
      }

      // Load shifts
      const shiftsResponse = await fetch('/api/shifts')
      let shiftsData: any[] = []
      if (shiftsResponse.ok) {
        const json = await shiftsResponse.json()
        shiftsData = json.data || json.shifts || json || []
        setShifts(shiftsData)
      }

      // Load swap requests
      const swapResponse = await fetch('/api/onboarding/swap-requests')
      let swapData: any[] = []
      if (swapResponse.ok) {
        const json = await swapResponse.json()
        swapData = json.data || json.swapRequests || json || []
        setSwapRequests(swapData)
      }

      // Load leave requests
      const leaveResponse = await fetch('/api/onboarding/leave-requests')
      let leaveData: any[] = []
      if (leaveResponse.ok) {
        const json = await leaveResponse.json()
        leaveData = json.data || json.leaveRequests || json || []
        setLeaveRequests(leaveData)
      }

      // Calculate stats
      const activeEmployees = employeesData.filter(emp => emp.is_active).length
      const completedShifts = shiftsData.filter(shift => shift.status === 'completed').length
      const pendingSwapRequests = swapData.filter(req => req.status === 'pending').length
      const pendingLeaveRequests = leaveData.filter(req => req.status === 'pending').length

      setStats({
        totalEmployees: employeesData.length,
        activeEmployees,
        totalShifts: shiftsData.length,
        completedShifts,
        weeklyHours: 168, // Mock total weekly hours
        avgHoursPerEmployee: employeesData.length > 0 ? Math.round(168 / employeesData.length) : 0,
        pendingSwapRequests,
        pendingLeaveRequests
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleApproveSwapRequest = async (requestId: string) => {
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
        await loadDashboardData() // Refresh stats
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to approve request')
      }
    } catch (error) {
      console.error('Error approving swap request:', error)
      toast.error('Failed to approve request')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectSwapRequest = async (requestId: string) => {
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
        await loadDashboardData() // Refresh stats
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to reject request')
      }
    } catch (error) {
      console.error('Error rejecting swap request:', error)
      toast.error('Failed to reject request')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveLeaveRequest = async (requestId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/onboarding/leave-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
        }),
      })

      if (response.ok) {
        setLeaveRequests(prev => 
          prev.map(req => 
            req.id === requestId ? { ...req, status: 'approved' as const } : req
          )
        )
        toast.success('Leave request approved!')
        await loadDashboardData() // Refresh stats
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to approve request')
      }
    } catch (error) {
      console.error('Error approving leave request:', error)
      toast.error('Failed to approve request')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectLeaveRequest = async (requestId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/onboarding/leave-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
        }),
      })

      if (response.ok) {
        setLeaveRequests(prev => 
          prev.map(req => 
            req.id === requestId ? { ...req, status: 'rejected' as const } : req
          )
        )
        toast.success('Leave request rejected')
        await loadDashboardData() // Refresh stats
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to reject request')
      }
    } catch (error) {
      console.error('Error rejecting leave request:', error)
      toast.error('Failed to reject request')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    AuthService.logout()
    router.push('/admin/login')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>
      case 'in-progress':
        return <Badge variant="default">In Progress</Badge>
      case 'completed':
        return <Badge variant="outline">Completed</Badge>
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

  const handleBroadcastMessage = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Please enter a message')
      return
    }
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: broadcastMessage,
          employeeIds: broadcastToAll ? null : selectedEmployeeIds,
          sendToAll: broadcastToAll
        }),
      })

      if (response.ok) {
        toast.success('Message sent successfully!')
        setShowBroadcastModal(false)
        setBroadcastMessage('')
        setSelectedEmployeeIds([])
        setBroadcastToAll(true)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending broadcast message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-2 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Welcome back, {currentUser?.email || 'Administrator'}!
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => setShowBroadcastModal(true)} variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Broadcast Message
              </Button>
              <Button onClick={() => router.push('/admin/reports')} variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </Button>
              <Button onClick={() => router.push('/admin/scheduling')} variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Create Shift
              </Button>
              <Button onClick={() => router.push('/admin/employees')} variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Employees
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                  <p className="text-xs text-gray-500">{stats.activeEmployees} active</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Shifts</p>
                  <p className="text-2xl font-bold">{stats.totalShifts}</p>
                  <p className="text-xs text-gray-500">{stats.completedShifts} completed</p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold">{stats.pendingSwapRequests + stats.pendingLeaveRequests}</p>
                  <p className="text-xs text-gray-500">Swap: {stats.pendingSwapRequests} | Leave: {stats.pendingLeaveRequests}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Weekly Hours</p>
                  <p className="text-2xl font-bold">{stats.weeklyHours}h</p>
                  <p className="text-xs text-gray-500">Avg: {stats.avgHoursPerEmployee}h/employee</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="swap-requests">Swap Requests</TabsTrigger>
            <TabsTrigger value="leave-requests">Leave Requests</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Employees */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Employees</CardTitle>
                  <CardDescription>Latest employee additions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {employees.slice(0, 5).map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                          <p className="text-sm text-gray-500">{employee.position}</p>
                        </div>
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Shifts */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Shifts</CardTitle>
                  <CardDescription>Latest shift activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {shifts.slice(0, 5).map((shift) => (
                      <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{shift.name}</p>
                          <p className="text-sm text-gray-500">{shift.start_time} - {shift.end_time}</p>
                        </div>
                        {getStatusBadge(shift.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Swap Requests Tab */}
          <TabsContent value="swap-requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Swap Requests</CardTitle>
                <CardDescription>Review and approve shift swap requests</CardDescription>
              </CardHeader>
              <CardContent>
                {swapRequests.filter(req => req.status === 'pending').length > 0 ? (
                  <div className="space-y-4">
                    {swapRequests.filter(req => req.status === 'pending').map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
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
                            <span className="text-gray-400">→</span>
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
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveSwapRequest(request.id)}
                              disabled={isLoading}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectSwapRequest(request.id)}
                              disabled={isLoading}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No pending swap requests</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Requests Tab */}
          <TabsContent value="leave-requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Leave Requests</CardTitle>
                <CardDescription>Review and approve leave requests</CardDescription>
              </CardHeader>
              <CardContent>
                {leaveRequests.filter(req => req.status === 'pending').length > 0 ? (
                  <div className="space-y-4">
                    {leaveRequests.filter(req => req.status === 'pending').map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{request.employee_name}</span>
                            <Badge variant="outline">{request.leave_type}</Badge>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Start Date</p>
                            <p className="text-sm text-gray-600">{new Date(request.start_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">End Date</p>
                            <p className="text-sm text-gray-600">{new Date(request.end_date).toLocaleDateString()}</p>
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
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveLeaveRequest(request.id)}
                              disabled={isLoading}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectLeaveRequest(request.id)}
                              disabled={isLoading}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No pending leave requests</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Employees</CardTitle>
                <CardDescription>Manage employee information and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                        <p className="text-sm text-gray-500">{employee.email}</p>
                        <p className="text-sm text-gray-500">{employee.position} • {employee.department}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Broadcast Message</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full border rounded px-3 py-2 h-32"
                  placeholder="Enter your message..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Recipients</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={broadcastToAll}
                      onChange={() => setBroadcastToAll(true)}
                      className="mr-2"
                    />
                    Send to all employees
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!broadcastToAll}
                      onChange={() => setBroadcastToAll(false)}
                      className="mr-2"
                    />
                    Select specific employees
                  </label>
                </div>
              </div>
              
              {!broadcastToAll && (
                <div>
                  <label className="block text-sm font-medium mb-2">Select Employees</label>
                  <select
                    multiple
                    value={selectedEmployeeIds}
                    onChange={(e) => setSelectedEmployeeIds(Array.from(e.target.selectedOptions, option => option.value))}
                    className="w-full border rounded px-3 py-2 h-32"
                    required
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowBroadcastModal(false)
                    setBroadcastMessage('')
                    setSelectedEmployeeIds([])
                    setBroadcastToAll(true)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBroadcastMessage}
                  disabled={isLoading || !broadcastMessage.trim()}
                >
                  {isLoading ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
