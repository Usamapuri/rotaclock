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
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Employee {
  id: string
  name: string
  email: string
  phone: string
  department: string
  position: string
  hourlyRate: number
  maxHoursPerWeek: number
  startDate: string
  status: "active" | "inactive"
  profilePicture?: string
  about?: string
  skills: string[]
  availability: {
    [key: string]: { start: string; end: string; available: boolean }
  }
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
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

export default function AdminEmployees() {
  const [adminUser, setAdminUser] = useState("")
  const [activeTab, setActiveTab] = useState("employees")
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false)
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false)
  const [showAssignShiftDialog, setShowAssignShiftDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const router = useRouter()

  // Sample data
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "001",
      name: "John Doe",
      email: "john@company.com",
      phone: "+1-555-0123",
      department: "Sales",
      position: "Sales Associate",
      hourlyRate: 15.5,
      maxHoursPerWeek: 40,
      startDate: "2023-06-15",
      status: "active",
      about: "Experienced sales professional with excellent customer service skills.",
      skills: ["Customer Service", "Sales", "Communication"],
      availability: {
        monday: { start: "09:00", end: "17:00", available: true },
        tuesday: { start: "09:00", end: "17:00", available: true },
        wednesday: { start: "09:00", end: "17:00", available: true },
        thursday: { start: "09:00", end: "17:00", available: true },
        friday: { start: "09:00", end: "17:00", available: true },
        saturday: { start: "10:00", end: "14:00", available: false },
        sunday: { start: "10:00", end: "14:00", available: false },
      },
      emergencyContact: {
        name: "Jane Doe",
        phone: "+1-555-0124",
        relationship: "Spouse",
      },
    },
  ])

  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: "morning",
      name: "Morning Shift",
      description: "Early morning operations and customer service",
      startTime: "06:00",
      endTime: "14:00",
      department: "All",
      requiredStaff: 3,
      requiredSkills: ["Customer Service"],
      color: "#3B82F6",
      hourlyRate: 16.0,
      isActive: true,
    },
    {
      id: "day",
      name: "Day Shift",
      description: "Regular business hours operations",
      startTime: "09:00",
      endTime: "17:00",
      department: "All",
      requiredStaff: 5,
      requiredSkills: ["Customer Service", "Sales"],
      color: "#10B981",
      hourlyRate: 15.5,
      isActive: true,
    },
  ])

  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([
    {
      id: "1",
      employeeId: "001",
      employeeName: "John Doe",
      shiftId: "day",
      shiftName: "Day Shift",
      date: "2024-01-08",
      startTime: "09:00",
      endTime: "17:00",
      status: "assigned",
    },
  ])

  const [rescheduleRequests, setRescheduleRequests] = useState<RescheduleRequest[]>([
    {
      id: "1",
      employeeId: "001",
      employeeName: "John Doe",
      originalShift: {
        id: "1",
        date: "2024-01-10",
        shiftName: "Day Shift",
        time: "09:00-17:00",
      },
      requestedDate: "2024-01-12",
      requestedTime: "09:00-17:00",
      reason: "Medical appointment conflict",
      status: "pending",
      submittedAt: "2024-01-09T14:30:00Z",
    },
  ])

  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    hourlyRate: 15.0,
    maxHoursPerWeek: 40,
    status: "active",
    skills: [],
    availability: {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: true },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "17:00", available: true },
      saturday: { start: "09:00", end: "17:00", available: false },
      sunday: { start: "09:00", end: "17:00", available: false },
    },
    emergencyContact: {
      name: "",
      phone: "",
      relationship: "",
    },
  })

  const [newShift, setNewShift] = useState<Partial<Shift>>({
    name: "",
    description: "",
    startTime: "09:00",
    endTime: "17:00",
    department: "All",
    requiredStaff: 1,
    requiredSkills: [],
    color: "#3B82F6",
    hourlyRate: 15.0,
    isActive: true,
  })

  const [assignShiftData, setAssignShiftData] = useState({
    employeeId: "",
    shiftId: "",
    date: "",
    notes: "",
  })

  useEffect(() => {
    const storedAdminUser = localStorage.getItem("adminUser")
    if (!storedAdminUser) {
      router.push("/admin/login")
    } else {
      setAdminUser(storedAdminUser)
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("adminUser")
    router.push("/admin/login")
  }

  const handleAddEmployee = () => {
    const employee: Employee = {
      ...newEmployee,
      id: Date.now().toString(),
      startDate: new Date().toISOString().split("T")[0],
    } as Employee

    setEmployees([...employees, employee])
    setNewEmployee({
      name: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      hourlyRate: 15.0,
      maxHoursPerWeek: 40,
      status: "active",
      skills: [],
      availability: {
        monday: { start: "09:00", end: "17:00", available: true },
        tuesday: { start: "09:00", end: "17:00", available: true },
        wednesday: { start: "09:00", end: "17:00", available: true },
        thursday: { start: "09:00", end: "17:00", available: true },
        friday: { start: "09:00", end: "17:00", available: true },
        saturday: { start: "09:00", end: "17:00", available: false },
        sunday: { start: "09:00", end: "17:00", available: false },
      },
      emergencyContact: {
        name: "",
        phone: "",
        relationship: "",
      },
    })
    setShowAddEmployeeDialog(false)
  }

  const handleAddShift = () => {
    const shift: Shift = {
      ...newShift,
      id: Date.now().toString(),
    } as Shift

    setShifts([...shifts, shift])
    setNewShift({
      name: "",
      description: "",
      startTime: "09:00",
      endTime: "17:00",
      department: "All",
      requiredStaff: 1,
      requiredSkills: [],
      color: "#3B82F6",
      hourlyRate: 15.0,
      isActive: true,
    })
    setShowAddShiftDialog(false)
  }

  const handleAssignShift = () => {
    const employee = employees.find((e) => e.id === assignShiftData.employeeId)
    const shift = shifts.find((s) => s.id === assignShiftData.shiftId)

    if (employee && shift) {
      const assignment: ShiftAssignment = {
        id: Date.now().toString(),
        employeeId: employee.id,
        employeeName: employee.name,
        shiftId: shift.id,
        shiftName: shift.name,
        date: assignShiftData.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: "assigned",
        notes: assignShiftData.notes,
      }

      setShiftAssignments([...shiftAssignments, assignment])
      setAssignShiftData({
        employeeId: "",
        shiftId: "",
        date: "",
        notes: "",
      })
      setShowAssignShiftDialog(false)
    }
  }

  const handleRescheduleRequest = (requestId: string, action: "approve" | "deny", adminNotes?: string) => {
    setRescheduleRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: action === "approve" ? "approved" : "denied",
              adminNotes: adminNotes || "",
            }
          : request,
      ),
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "approved":
      case "confirmed":
        return "default"
      case "inactive":
      case "denied":
      case "cancelled":
        return "destructive"
      case "pending":
      case "assigned":
        return "secondary"
      default:
        return "outline"
    }
  }

  const departments = ["Sales", "Support", "Marketing", "Operations", "Management"]
  const skillsList = [
    "Customer Service",
    "Sales",
    "Technical Support",
    "Management",
    "Communication",
    "Problem Solving",
  ]

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
              <span className="text-sm text-gray-600">Welcome, {adminUser}</span>
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
                  <p className="text-2xl font-bold">{employees.filter((e) => e.status === "active").length}</p>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
              <Dialog open={showAddEmployeeDialog} onOpenChange={setShowAddEmployeeDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>Create a new employee profile with all necessary information.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={newEmployee.name}
                          onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newEmployee.email}
                          onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                          placeholder="john@company.com"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={newEmployee.phone}
                          onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                          placeholder="+1-555-0123"
                        />
                      </div>
                      <div>
                        <Label htmlFor="department">Department</Label>
                        <Select
                          value={newEmployee.department}
                          onValueChange={(value) => setNewEmployee({ ...newEmployee, department: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          value={newEmployee.position}
                          onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                          placeholder="Sales Associate"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          step="0.25"
                          value={newEmployee.hourlyRate}
                          onChange={(e) =>
                            setNewEmployee({ ...newEmployee, hourlyRate: Number.parseFloat(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="maxHours">Max Hours Per Week</Label>
                      <Input
                        id="maxHours"
                        type="number"
                        value={newEmployee.maxHoursPerWeek}
                        onChange={(e) =>
                          setNewEmployee({ ...newEmployee, maxHoursPerWeek: Number.parseInt(e.target.value) })
                        }
                      />
                    </div>

                    <div>
                      <Label>Emergency Contact</Label>
                      <div className="grid md:grid-cols-3 gap-2 mt-2">
                        <Input
                          placeholder="Contact Name"
                          value={newEmployee.emergencyContact?.name}
                          onChange={(e) =>
                            setNewEmployee({
                              ...newEmployee,
                              emergencyContact: { ...newEmployee.emergencyContact!, name: e.target.value },
                            })
                          }
                        />
                        <Input
                          placeholder="Phone"
                          value={newEmployee.emergencyContact?.phone}
                          onChange={(e) =>
                            setNewEmployee({
                              ...newEmployee,
                              emergencyContact: { ...newEmployee.emergencyContact!, phone: e.target.value },
                            })
                          }
                        />
                        <Input
                          placeholder="Relationship"
                          value={newEmployee.emergencyContact?.relationship}
                          onChange={(e) =>
                            setNewEmployee({
                              ...newEmployee,
                              emergencyContact: { ...newEmployee.emergencyContact!, relationship: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={handleAddEmployee}>Add Employee</Button>
                      <Button variant="outline" onClick={() => setShowAddEmployeeDialog(false)}>
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
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          {employee.profilePicture ? (
                            <img
                              src={employee.profilePicture || "/placeholder.svg"}
                              alt={employee.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-semibold text-gray-600">
                              {employee.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold">{employee.name}</h4>
                          <p className="text-sm text-gray-600">
                            {employee.position} • {employee.department}
                          </p>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">${employee.hourlyRate}/hr</Badge>
                            <Badge variant={getStatusColor(employee.status)}>{employee.status}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedEmployee(employee)}>
                          <Eye className="h-4 w-4" />
                        </Button>
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
                          {employees
                            .filter((e) => e.status === "active")
                            .map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name} - {employee.department}
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
          <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Employee Details</DialogTitle>
                <DialogDescription>Complete employee information and profile</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    {selectedEmployee.profilePicture ? (
                      <img
                        src={selectedEmployee.profilePicture || "/placeholder.svg"}
                        alt={selectedEmployee.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-semibold text-gray-600">
                        {selectedEmployee.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedEmployee.name}</h3>
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
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-gray-600">{selectedEmployee.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Hourly Rate</p>
                    <p className="text-sm text-gray-600">${selectedEmployee.hourlyRate}/hr</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Max Hours/Week</p>
                    <p className="text-sm text-gray-600">{selectedEmployee.maxHoursPerWeek} hours</p>
                  </div>
                </div>

                {selectedEmployee.about && (
                  <div>
                    <p className="text-sm font-medium">About</p>
                    <p className="text-sm text-gray-600">{selectedEmployee.about}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployee.skills.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Emergency Contact</p>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm">
                      <strong>{selectedEmployee.emergencyContact.name}</strong> (
                      {selectedEmployee.emergencyContact.relationship})
                    </p>
                    <p className="text-sm text-gray-600">{selectedEmployee.emergencyContact.phone}</p>
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
