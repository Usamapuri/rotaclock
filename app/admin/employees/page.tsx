"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Clock,
  Users,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  ArrowLeft,
  Filter,
  Download
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"

interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  hire_date: string
  hourly_rate: number
  is_active: boolean
}

interface Shift {
  id: string
  name: string
  description: string
  startTime: string
  endTime: string
  department: string
  requiredStaff: number
  requiredSkills: string[]
  color: string
  hourlyRate?: number
  isActive: boolean
}

interface ShiftAssignment {
  id: string
  employeeId: string
  employeeName: string
  shiftId: string
  shiftName: string
  date: string
  startTime: string
  endTime: string
  status: "assigned" | "confirmed" | "completed" | "cancelled"
  notes?: string
}

interface RescheduleRequest {
  id: string
  employeeId: string
  employeeName: string
  originalShift: {
    id: string
    date: string
    shiftName: string
    time: string
  }
  requestedDate: string
  requestedTime: string
  reason: string
  status: "pending" | "approved" | "denied"
  submittedAt: string
  adminNotes?: string
}

export default function EmployeeManagement() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  
  const router = useRouter()

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'admin') {
      router.push('/admin/login')
      return
    }
    setCurrentUser(user)
    loadEmployees()
  }, [router])

  useEffect(() => {
    filterEmployees()
  }, [employees, searchTerm, departmentFilter, statusFilter])

  const loadEmployees = async () => {
    setIsLoading(true)
    try {
      // Mock data for demo
      const mockEmployees: Employee[] = [
        {
          id: '1',
          employee_id: 'EMP001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@company.com',
          department: 'Engineering',
          position: 'Software Engineer',
          hire_date: '2023-01-15',
          hourly_rate: 25.00,
          is_active: true
        },
        {
          id: '2',
          employee_id: 'EMP002',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@company.com',
          department: 'Marketing',
          position: 'Marketing Manager',
          hire_date: '2023-02-01',
          hourly_rate: 30.00,
          is_active: true
        },
        {
          id: '3',
          employee_id: 'EMP003',
          first_name: 'Mike',
          last_name: 'Johnson',
          email: 'mike.johnson@company.com',
          department: 'Sales',
          position: 'Sales Representative',
          hire_date: '2023-03-10',
          hourly_rate: 22.00,
          is_active: true
        },
        {
          id: '4',
          employee_id: 'EMP004',
          first_name: 'Sarah',
          last_name: 'Wilson',
          email: 'sarah.wilson@company.com',
          department: 'HR',
          position: 'HR Specialist',
          hire_date: '2023-04-05',
          hourly_rate: 28.00,
          is_active: false
        }
      ]

      setEmployees(mockEmployees)
    } catch (error) {
      console.error('Error loading employees:', error)
      toast.error('Failed to load employees')
    } finally {
      setIsLoading(false)
    }
  }

  const filterEmployees = () => {
    let filtered = employees

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Department filter
    if (departmentFilter) {
      filtered = filtered.filter(emp => emp.department === departmentFilter)
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(emp => 
        statusFilter === 'active' ? emp.is_active : !emp.is_active
      )
    }

    setFilteredEmployees(filtered)
  }

  const handleAddEmployee = async (employeeData: Omit<Employee, 'id'>) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newEmployee: Employee = {
        ...employeeData,
        id: Date.now().toString()
      }
      
      setEmployees([...employees, newEmployee])
      setShowAddForm(false)
      toast.success('Employee added successfully!')
    } catch (error) {
      toast.error('Failed to add employee')
    }
  }

  const handleUpdateEmployee = async (id: string, employeeData: Partial<Employee>) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setEmployees(employees.map(emp => 
        emp.id === id ? { ...emp, ...employeeData } : emp
      ))
      setEditingEmployee(null)
      toast.success('Employee updated successfully!')
    } catch (error) {
      toast.error('Failed to update employee')
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this employee?')) return
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setEmployees(employees.map(emp => 
        emp.id === id ? { ...emp, is_active: false } : emp
      ))
      toast.success('Employee deactivated successfully!')
    } catch (error) {
      toast.error('Failed to deactivate employee')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("adminUser")
    router.push("/admin/login")
  }

  const departments = [...new Set(employees.map(emp => emp.department))]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-purple-600 mr-2" />
                  <span className="text-xl font-bold text-gray-900">ShiftTracker Admin</span>
                </div>
              </Link>
              <Badge variant="outline">Employee Management</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {currentUser?.username}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold">{employees.filter((e) => e.is_active).length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Shifts</p>
                  <p className="text-2xl font-bold">{shifts.filter((s) => s.isActive).length}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold">
                    {rescheduleRequests.filter((r) => r.status === "pending").length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Assignments</p>
                  <p className="text-2xl font-bold">{shiftAssignments.length}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value="employees" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="requests">Reschedule Requests</TabsTrigger>
          </TabsList>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Employee Management</h2>
              <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>Enter employee information</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">First Name</Label>
                        <Input id="first_name" required />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input id="last_name" required />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="department">Department</Label>
                        <select id="department" className="w-full p-2 border rounded-md" required>
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="position">Position</Label>
                        <Input id="position" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hire_date">Hire Date</Label>
                        <Input id="hire_date" type="date" required />
                      </div>
                      <div>
                        <Label htmlFor="hourly_rate">Hourly Rate</Label>
                        <Input id="hourly_rate" type="number" step="0.01" required />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Add Employee
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Employees</CardTitle>
                <CardDescription>Manage employee profiles and information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          {employee.first_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold">{employee.first_name} {employee.last_name}</h4>
                          <p className="text-sm text-gray-600">
                            {employee.position} • {employee.department}
                          </p>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">${employee.hourly_rate}/hr</Badge>
                            <Badge variant={employee.is_active ? "default" : "secondary"}>
                              {employee.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingEmployee(employee)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteEmployee(employee.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shifts Tab */}
          <TabsContent value="shifts" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Shift Management</h2>
              <Dialog open={showAddShiftDialog} onOpenChange={setShowAddShiftDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Shift
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Shift</DialogTitle>
                    <DialogDescription>Define a new shift type with specific requirements.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="shiftName">Shift Name</Label>
                      <Input
                        id="shiftName"
                        value={newShift.name}
                        onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                        placeholder="Morning Shift"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newShift.description}
                        onChange={(e) => setNewShift({ ...newShift, description: e.target.value })}
                        placeholder="Describe the shift responsibilities..."
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={newShift.startTime}
                          onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={newShift.endTime}
                          onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="shiftDepartment">Department</Label>
                        <Select
                          value={newShift.department}
                          onValueChange={(value) => setNewShift({ ...newShift, department: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All Departments</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="requiredStaff">Required Staff</Label>
                        <Input
                          id="requiredStaff"
                          type="number"
                          value={newShift.requiredStaff}
                          onChange={(e) => setNewShift({ ...newShift, requiredStaff: Number.parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="shiftRate">Hourly Rate ($)</Label>
                      <Input
                        id="shiftRate"
                        type="number"
                        step="0.25"
                        value={newShift.hourlyRate}
                        onChange={(e) => setNewShift({ ...newShift, hourlyRate: Number.parseFloat(e.target.value) })}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={handleAddShift}>Create Shift</Button>
                      <Button variant="outline" onClick={() => setShowAddShiftDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Shifts</CardTitle>
                <CardDescription>Manage shift types and configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: shift.color }} />
                        <div>
                          <h4 className="font-semibold">{shift.name}</h4>
                          <p className="text-sm text-gray-600">{shift.description}</p>
                          <p className="text-sm text-gray-600">
                            {shift.startTime} - {shift.endTime} • {shift.department}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">Staff: {shift.requiredStaff}</Badge>
                            <Badge variant="outline">${shift.hourlyRate}/hr</Badge>
                            <Badge variant={shift.isActive ? "default" : "secondary"}>
                              {shift.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
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

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Shift Assignments</h2>
              <Dialog open={showAssignShiftDialog} onOpenChange={setShowAssignShiftDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Shift
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Shift to Employee</DialogTitle>
                    <DialogDescription>Create a new shift assignment for an employee.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="assignEmployee">Employee</Label>
                      <Select
                        value={assignShiftData.employeeId}
                        onValueChange={(value) => setAssignShiftData({ ...assignShiftData, employeeId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredEmployees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.first_name} {employee.last_name} - {employee.department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="assignShift">Shift</Label>
                      <Select
                        value={assignShiftData.shiftId}
                        onValueChange={(value) => setAssignShiftData({ ...assignShiftData, shiftId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {shifts
                            .filter((s) => s.isActive)
                            .map((shift) => (
                              <SelectItem key={shift.id} value={shift.id}>
                                {shift.name} ({shift.startTime} - {shift.endTime})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="assignDate">Date</Label>
                      <Input
                        id="assignDate"
                        type="date"
                        value={assignShiftData.date}
                        onChange={(e) => setAssignShiftData({ ...assignShiftData, date: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="assignNotes">Notes (Optional)</Label>
                      <Textarea
                        id="assignNotes"
                        value={assignShiftData.notes}
                        onChange={(e) => setAssignShiftData({ ...assignShiftData, notes: e.target.value })}
                        placeholder="Any special instructions..."
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={handleAssignShift}>Assign Shift</Button>
                      <Button variant="outline" onClick={() => setShowAssignShiftDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Current Assignments</CardTitle>
                <CardDescription>View and manage shift assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shiftAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{assignment.employeeName}</h4>
                        <p className="text-sm text-gray-600">
                          {assignment.shiftName} • {new Date(assignment.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {assignment.startTime} - {assignment.endTime}
                        </p>
                        {assignment.notes && <p className="text-sm text-gray-500 mt-1">{assignment.notes}</p>}
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant={getStatusColor(assignment.status)}>{assignment.status}</Badge>
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

          {/* Reschedule Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Reschedule Requests</h2>
              <Badge variant="secondary">
                {rescheduleRequests.filter((r) => r.status === "pending").length} Pending
              </Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Employee Reschedule Requests</CardTitle>
                <CardDescription>Review and approve or deny employee reschedule requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rescheduleRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{request.employeeName}</h4>
                          <p className="text-sm text-gray-600">
                            Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-3">
                        <div className="p-3 bg-red-50 rounded">
                          <p className="text-sm font-medium text-red-900">Original Shift</p>
                          <p className="text-sm text-red-700">
                            {new Date(request.originalShift.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-red-700">
                            {request.originalShift.shiftName} • {request.originalShift.time}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <p className="text-sm font-medium text-green-900">Requested Change</p>
                          <p className="text-sm text-green-700">
                            {new Date(request.requestedDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-green-700">{request.requestedTime}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium">Reason:</p>
                        <p className="text-sm text-gray-600">{request.reason}</p>
                      </div>

                      {request.adminNotes && (
                        <div className="mb-3 p-2 bg-gray-50 rounded">
                          <p className="text-sm font-medium">Admin Notes:</p>
                          <p className="text-sm text-gray-600">{request.adminNotes}</p>
                        </div>
                      )}

                      {request.status === "pending" && (
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => handleRescheduleRequest(request.id, "approve")}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRescheduleRequest(request.id, "deny", "Schedule conflict")}
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
        </Tabs>

        {/* Employee Detail Modal */}
        {selectedEmployee && (
          <Dialog open={!!selectedEmployee} onOpenChange={() => setEditingEmployee(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Employee Details</DialogTitle>
                <DialogDescription>Complete employee information and profile</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    {selectedEmployee.first_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedEmployee.first_name} {selectedEmployee.last_name}</h3>
                    <p className="text-gray-600">{selectedEmployee.position}</p>
                    <p className="text-gray-600">{selectedEmployee.department}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-gray-600">{selectedEmployee.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Hire Date</p>
                    <p className="text-sm text-gray-600">{selectedEmployee.hire_date}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Hourly Rate</p>
                    <p className="text-sm text-gray-600">${selectedEmployee.hourly_rate}/hr</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
