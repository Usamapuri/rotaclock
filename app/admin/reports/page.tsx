"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Users,
  DollarSign,
  LogOut,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  AlertTriangle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { addDays } from "date-fns"
import type { DateRange } from "react-day-picker"

// Import chart components
import {
  Bar,
  BarChart,
  Pie,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface ReportData {
  totalEmployees: number
  activeEmployees: number
  totalHoursWorked: number
  totalPayroll: number
  averageHoursPerEmployee: number
  attendanceRate: number
  overtimeHours: number
  lateClockIns: number
}

interface EmployeePerformance {
  id: string
  name: string
  hoursWorked: number
  scheduledHours: number
  attendanceRate: number
  lateClockIns: number
  overtimeHours: number
  efficiency: number
}

interface DepartmentData {
  name: string
  employees: number
  hoursWorked: number
  payroll: number
  color: string
}

export default function AdminReports() {
  const [adminUser, setAdminUser] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [selectedPeriod, setSelectedPeriod] = useState("30days")
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const router = useRouter()

  // Sample data - in real app, this would come from API
  const reportData: ReportData = {
    totalEmployees: 24,
    activeEmployees: 22,
    totalHoursWorked: 3456,
    totalPayroll: 58240.5,
    averageHoursPerEmployee: 157.1,
    attendanceRate: 94.2,
    overtimeHours: 234,
    lateClockIns: 18,
  }

  const employeePerformance: EmployeePerformance[] = [
    {
      id: "001",
      name: "John Doe",
      hoursWorked: 168,
      scheduledHours: 160,
      attendanceRate: 98.5,
      lateClockIns: 1,
      overtimeHours: 8,
      efficiency: 105,
    },
    {
      id: "002",
      name: "Jane Smith",
      hoursWorked: 152,
      scheduledHours: 160,
      attendanceRate: 92.3,
      lateClockIns: 3,
      overtimeHours: 0,
      efficiency: 95,
    },
    {
      id: "003",
      name: "Mike Johnson",
      hoursWorked: 175,
      scheduledHours: 160,
      attendanceRate: 96.8,
      lateClockIns: 2,
      overtimeHours: 15,
      efficiency: 109,
    },
    {
      id: "004",
      name: "Sarah Wilson",
      hoursWorked: 144,
      scheduledHours: 160,
      attendanceRate: 89.1,
      lateClockIns: 5,
      overtimeHours: 0,
      efficiency: 90,
    },
  ]

  const departmentData: DepartmentData[] = [
    { name: "Sales", employees: 8, hoursWorked: 1280, payroll: 21600, color: "#8884d8" },
    { name: "Support", employees: 6, hoursWorked: 960, payroll: 14400, color: "#82ca9d" },
    { name: "Marketing", employees: 4, hoursWorked: 640, payroll: 11200, color: "#ffc658" },
    { name: "Operations", employees: 6, hoursWorked: 576, payroll: 11040.5, color: "#ff7300" },
  ]

  const weeklyHoursData = [
    { week: "Week 1", hours: 856, target: 800 },
    { week: "Week 2", hours: 892, target: 800 },
    { week: "Week 3", hours: 834, target: 800 },
    { week: "Week 4", hours: 874, target: 800 },
  ]

  const attendanceData = [
    { day: "Mon", present: 22, absent: 2, late: 3 },
    { day: "Tue", present: 21, absent: 3, late: 2 },
    { day: "Wed", present: 23, absent: 1, late: 1 },
    { day: "Thu", present: 20, absent: 4, late: 4 },
    { day: "Fri", present: 22, absent: 2, late: 2 },
  ]

  const costAnalysisData = [
    { category: "Regular Hours", amount: 45600, percentage: 78.3 },
    { category: "Overtime", amount: 8640, percentage: 14.8 },
    { category: "Benefits", amount: 2880, percentage: 4.9 },
    { category: "Other", amount: 1120.5, percentage: 1.9 },
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

  const handleExportReport = (reportType: string) => {
    // In a real app, this would generate and download the report
    console.log(`Exporting ${reportType} report...`)
  }

  const getPerformanceColor = (efficiency: number) => {
    if (efficiency >= 100) return "text-green-600"
    if (efficiency >= 90) return "text-yellow-600"
    return "text-red-600"
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return "text-green-600"
    if (rate >= 90) return "text-yellow-600"
    return "text-red-600"
  }

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
              <Badge variant="outline">Reports & Analytics</Badge>
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
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8 p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Period:</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Department:</label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedPeriod === "custom" && <DatePickerWithRange date={dateRange} setDate={setDateRange} />}

          <Button onClick={() => handleExportReport("summary")} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours Worked</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalHoursWorked.toLocaleString()}h</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12.5% from last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.attendanceRate}%</div>
              <div className="flex items-center text-xs text-red-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                -2.1% from last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${reportData.totalPayroll.toLocaleString()}</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8.3% from last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.overtimeHours}h</div>
              <div className="flex items-center text-xs text-yellow-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +15.2% from last period
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Reports Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Weekly Hours Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Weekly Hours Trend
                  </CardTitle>
                  <CardDescription>Actual vs Target Hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      hours: { label: "Actual Hours", color: "hsl(var(--chart-1))" },
                      target: { label: "Target Hours", color: "hsl(var(--chart-2))" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyHoursData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="hours" fill="var(--color-hours)" name="Actual Hours" />
                        <Bar dataKey="target" fill="var(--color-target)" name="Target Hours" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Department Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Hours by Department
                  </CardTitle>
                  <CardDescription>Distribution of total hours worked</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      hours: { label: "Hours" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={departmentData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="hoursWorked"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {departmentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Cost Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
                <CardDescription>Breakdown of payroll costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costAnalysisData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: departmentData[index]?.color || "#8884d8" }}
                        />
                        <span className="font-medium">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${item.amount.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">{item.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Daily Attendance */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Attendance Overview</CardTitle>
                  <CardDescription>Present, absent, and late employees by day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      present: { label: "Present", color: "hsl(var(--chart-1))" },
                      absent: { label: "Absent", color: "hsl(var(--chart-2))" },
                      late: { label: "Late", color: "hsl(var(--chart-3))" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="present" stackId="a" fill="var(--color-present)" />
                        <Bar dataKey="late" stackId="a" fill="var(--color-late)" />
                        <Bar dataKey="absent" stackId="a" fill="var(--color-absent)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Attendance Issues */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Issues</CardTitle>
                  <CardDescription>Employees requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 border-l-4 border-red-500 bg-red-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-red-800">High Absenteeism</h4>
                          <p className="text-sm text-red-600">3 employees with attendance rate below 85%</p>
                        </div>
                        <Badge variant="destructive">Critical</Badge>
                      </div>
                    </div>
                    <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-yellow-800">Frequent Late Arrivals</h4>
                          <p className="text-sm text-yellow-600">5 employees with 3+ late clock-ins this week</p>
                        </div>
                        <Badge variant="secondary">Warning</Badge>
                      </div>
                    </div>
                    <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-blue-800">Perfect Attendance</h4>
                          <p className="text-sm text-blue-600">12 employees with 100% attendance this month</p>
                        </div>
                        <Badge>Excellent</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Employee Performance Report</CardTitle>
                    <CardDescription>Individual employee metrics and efficiency ratings</CardDescription>
                  </div>
                  <Button onClick={() => handleExportReport("performance")} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employeePerformance.map((employee) => (
                    <div key={employee.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{employee.name}</h4>
                          <p className="text-sm text-gray-600">ID: {employee.id}</p>
                        </div>
                        <Badge
                          variant={
                            employee.efficiency >= 100
                              ? "default"
                              : employee.efficiency >= 90
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {employee.efficiency}% Efficiency
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Hours Worked</p>
                          <p className="font-semibold">{employee.hoursWorked}h</p>
                          <p className="text-xs text-gray-500">of {employee.scheduledHours}h scheduled</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Attendance Rate</p>
                          <p className={`font-semibold ${getAttendanceColor(employee.attendanceRate)}`}>
                            {employee.attendanceRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Late Clock-ins</p>
                          <p className="font-semibold">{employee.lateClockIns}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Overtime Hours</p>
                          <p className="font-semibold">{employee.overtimeHours}h</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Performance</p>
                          <p className={`font-semibold ${getPerformanceColor(employee.efficiency)}`}>
                            {employee.efficiency >= 100
                              ? "Excellent"
                              : employee.efficiency >= 90
                                ? "Good"
                                : "Needs Improvement"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Detailed Payroll Report</CardTitle>
                    <CardDescription>Comprehensive payroll breakdown by employee</CardDescription>
                  </div>
                  <Button onClick={() => handleExportReport("payroll")} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Payroll
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employeePerformance.map((employee) => {
                    const regularPay = Math.min(employee.hoursWorked, 40) * 16.5 // Assuming $16.5 base rate
                    const overtimePay = Math.max(0, employee.hoursWorked - 40) * 16.5 * 1.5
                    const totalPay = regularPay + overtimePay

                    return (
                      <div key={employee.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">{employee.name}</h4>
                            <p className="text-sm text-gray-600">ID: {employee.id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">${totalPay.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">Total Pay</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Regular Hours</p>
                            <p className="font-semibold">{Math.min(employee.hoursWorked, 40)}h</p>
                            <p className="text-xs text-gray-500">${regularPay.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Overtime Hours</p>
                            <p className="font-semibold">{employee.overtimeHours}h</p>
                            <p className="text-xs text-gray-500">${overtimePay.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Hourly Rate</p>
                            <p className="font-semibold">$16.50</p>
                            <p className="text-xs text-gray-500">OT: $24.75</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Deductions</p>
                            <p className="font-semibold">$0.00</p>
                            <p className="text-xs text-gray-500">None</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Payroll</span>
                      <span className="text-green-600">${reportData.totalPayroll.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
                <CardDescription>Comparative analysis across departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {departmentData.map((dept) => (
                    <div key={dept.name} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-semibold">{dept.name}</h4>
                          <p className="text-sm text-gray-600">{dept.employees} employees</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">${dept.payroll.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">Total payroll</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Hours</p>
                          <p className="text-xl font-bold">{dept.hoursWorked}h</p>
                          <p className="text-xs text-gray-500">
                            {(dept.hoursWorked / dept.employees).toFixed(1)}h per employee
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Average Cost per Hour</p>
                          <p className="text-xl font-bold">${(dept.payroll / dept.hoursWorked).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Productivity Score</p>
                          <p className="text-xl font-bold text-green-600">{Math.floor(Math.random() * 20 + 80)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
