"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Users, Calendar, DollarSign, LogOut, Plus, Edit, Trash2, Eye, BarChart3 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Employee {
  id: string
  name: string
  email: string
  hourlyRate: number
  status: "active" | "inactive"
  totalHours: number
  payPeriodHours: number
}

interface Shift {
  id: string
  employeeId: string
  employeeName: string
  date: string
  startTime: string
  endTime: string
  status: "scheduled" | "completed" | "in-progress"
}

export default function AdminDashboard() {
  const [adminUser, setAdminUser] = useState("")
  const router = useRouter()

  const employees: Employee[] = [
    {
      id: "001",
      name: "John Doe",
      email: "john@company.com",
      hourlyRate: 15.5,
      status: "active",
      totalHours: 156.5,
      payPeriodHours: 32.5,
    },
    {
      id: "002",
      name: "Jane Smith",
      email: "jane@company.com",
      hourlyRate: 18.0,
      status: "active",
      totalHours: 142.0,
      payPeriodHours: 28.0,
    },
    {
      id: "003",
      name: "Mike Johnson",
      email: "mike@company.com",
      hourlyRate: 16.75,
      status: "active",
      totalHours: 168.5,
      payPeriodHours: 35.5,
    },
    {
      id: "004",
      name: "Sarah Wilson",
      email: "sarah@company.com",
      hourlyRate: 17.25,
      status: "inactive",
      totalHours: 89.0,
      payPeriodHours: 0,
    },
  ]

  const shifts: Shift[] = [
    {
      id: "1",
      employeeId: "001",
      employeeName: "John Doe",
      date: "2024-01-08",
      startTime: "09:00",
      endTime: "17:00",
      status: "scheduled",
    },
    {
      id: "2",
      employeeId: "002",
      employeeName: "Jane Smith",
      date: "2024-01-08",
      startTime: "10:00",
      endTime: "18:00",
      status: "in-progress",
    },
    {
      id: "3",
      employeeId: "003",
      employeeName: "Mike Johnson",
      date: "2024-01-08",
      startTime: "08:00",
      endTime: "16:00",
      status: "completed",
    },
    {
      id: "4",
      employeeId: "001",
      employeeName: "John Doe",
      date: "2024-01-09",
      startTime: "09:00",
      endTime: "17:00",
      status: "scheduled",
    },
  ]

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

  const calculatePayroll = (employee: Employee) => {
    return (employee.payPeriodHours * employee.hourlyRate).toFixed(2)
  }

  const totalPayroll = employees
    .filter((emp) => emp.status === "active")
    .reduce((sum, emp) => sum + emp.payPeriodHours * emp.hourlyRate, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-purple-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">ShiftTracker Admin</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/admin/reports">
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Reports
                </Button>
              </Link>
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
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.filter((emp) => emp.status === "active").length}</div>
              <p className="text-xs text-muted-foreground">
                {employees.filter((emp) => emp.status === "inactive").length} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {shifts.filter((shift) => shift.status === "in-progress").length}
              </div>
              <p className="text-xs text-muted-foreground">
                {shifts.filter((shift) => shift.status === "scheduled").length} scheduled today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours (Period)</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.reduce((sum, emp) => sum + emp.payPeriodHours, 0)}h</div>
              <p className="text-xs text-muted-foreground">Current pay period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payroll Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPayroll.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Current pay period</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList>
            <TabsTrigger value="employees">Employee Management</TabsTrigger>
            <TabsTrigger value="shifts">Shift Management</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>

          {/* Employee Management */}
          <TabsContent value="employees" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Employee Management</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
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
                        <div>
                          <h4 className="font-semibold">{employee.name}</h4>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                          <p className="text-sm text-gray-600">ID: {employee.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">${employee.hourlyRate}/hr</p>
                          <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                            {employee.status}
                          </Badge>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shift Management */}
          <TabsContent value="shifts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Shift Management</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Shift
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Shifts</CardTitle>
                <CardDescription>View and manage employee shifts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h4 className="font-semibold">{shift.employeeName}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(shift.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {shift.startTime} - {shift.endTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge
                          variant={
                            shift.status === "completed"
                              ? "default"
                              : shift.status === "in-progress"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {shift.status}
                        </Badge>
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

          {/* Payroll */}
          <TabsContent value="payroll" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Payroll Calculation</h2>
              <Button>Export Payroll</Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Current Pay Period</CardTitle>
                <CardDescription>Automatic payroll calculation based on hours worked</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employees
                    .filter((emp) => emp.status === "active")
                    .map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h4 className="font-semibold">{employee.name}</h4>
                            <p className="text-sm text-gray-600">ID: {employee.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-8">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Hours</p>
                            <p className="font-semibold">{employee.payPeriodHours}h</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Rate</p>
                            <p className="font-semibold">${employee.hourlyRate}/hr</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Total Pay</p>
                            <p className="font-semibold text-green-600">${calculatePayroll(employee)}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Total Payroll</h3>
                      <p className="text-2xl font-bold text-green-600">${totalPayroll.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
