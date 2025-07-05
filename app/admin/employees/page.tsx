"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Search,
  Filter,
  Download,
  Eye,
  UserPlus,
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { AuthService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  is_active: boolean
  hire_date: string
  hourly_rate: number
}

interface EmployeeStats {
  employee_id: string
  total_shifts: number
  completed_shifts: number
  total_hours: number
  avg_hours_per_shift: number
  verification_completed: boolean
  last_verification_date?: string
  attendance_rate: number
  late_arrivals: number
  early_departures: number
}

export default function AdminEmployees() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const router = useRouter()

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'admin') {
      router.push('/admin/login')
      return
    }
    setCurrentUser(user)
    loadEmployeeData()
  }, [router])

  const loadEmployeeData = async () => {
    setIsLoading(true)
    try {
      // Load employees
      const employeesResponse = await fetch('/api/employees')
      let employeesData: Employee[] = []
      if (employeesResponse.ok) {
        const json = await employeesResponse.json()
        employeesData = json.data || json.employees || json || []
      } else {
        // Fallback data
        employeesData = [
          {
            id: '1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@company.com',
            department: 'Sales',
            position: 'Sales Representative',
            is_active: true,
            hire_date: '2024-01-15',
            hourly_rate: 15.50
          },
          {
            id: '2',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@company.com',
            department: 'Support',
            position: 'Customer Support',
            is_active: true,
            hire_date: '2024-02-01',
            hourly_rate: 16.00
          },
          {
            id: '3',
            first_name: 'Mike',
            last_name: 'Johnson',
            email: 'mike@company.com',
            department: 'Engineering',
            position: 'Software Engineer',
            is_active: true,
            hire_date: '2024-01-10',
            hourly_rate: 25.00
          }
        ]
      }
      setEmployees(employeesData)

      // Generate mock stats for demo
      const mockStats: EmployeeStats[] = employeesData.map(emp => ({
        employee_id: emp.id,
        total_shifts: Math.floor(Math.random() * 50) + 20,
        completed_shifts: Math.floor(Math.random() * 45) + 15,
        total_hours: Math.floor(Math.random() * 200) + 100,
        avg_hours_per_shift: Math.floor(Math.random() * 4) + 6,
        verification_completed: Math.random() > 0.2, // 80% completion rate
        last_verification_date: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        attendance_rate: Math.floor(Math.random() * 20) + 80, // 80-100%
        late_arrivals: Math.floor(Math.random() * 5),
        early_departures: Math.floor(Math.random() * 3)
      }))
      setEmployeeStats(mockStats)
    } catch (error) {
      console.error('Error loading employee data:', error)
      toast.error('Failed to load employee data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    AuthService.logout()
    router.push('/admin/login')
  }

  const getVerificationStatus = (employeeId: string) => {
    const stats = employeeStats.find(s => s.employee_id === employeeId)
    if (!stats) return <Badge variant="secondary">Unknown</Badge>
    
    if (stats.verification_completed) {
      return <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Yes
      </Badge>
    } else {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        No
      </Badge>
    }
  }

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 85) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  const departments = [...new Set(employees.map(emp => emp.department))]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee data...</p>
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
                  Employee Management
                </h1>
                <p className="text-sm text-gray-500">
                  View employee attendance, stats, and verification status
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => router.push('/admin/dashboard')} variant="outline" size="sm">
                Dashboard
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
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Search Employees</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <Label htmlFor="department">Department</Label>
            <select
              id="department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Employee List */}
        <div className="grid gap-6">
          {filteredEmployees.map((employee) => {
            const stats = employeeStats.find(s => s.employee_id === employee.id)
            return (
              <Card key={employee.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {employee.first_name} {employee.last_name}
                      </CardTitle>
                      <CardDescription>
                        {employee.position} • {employee.department} • {employee.email}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {employee.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Attendance Stats */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">Attendance</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Rate:</span>
                          <span className={getAttendanceRateColor(stats?.attendance_rate || 0)}>
                            {stats?.attendance_rate || 0}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Shifts:</span>
                          <span>{stats?.total_shifts || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Completed:</span>
                          <span>{stats?.completed_shifts || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Hours Stats */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">Hours</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Total Hours:</span>
                          <span>{stats?.total_hours || 0}h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Avg/Shift:</span>
                          <span>{stats?.avg_hours_per_shift || 0}h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Hourly Rate:</span>
                          <span>${employee.hourly_rate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Verification Status */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">Verification</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span>Completed:</span>
                          {getVerificationStatus(employee.id)}
                        </div>
                        {stats?.last_verification_date && (
                          <div className="text-xs text-gray-500">
                            Last: {new Date(stats.last_verification_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Issues */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">Issues</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Late Arrivals:</span>
                          <span className={stats?.late_arrivals && stats.late_arrivals > 0 ? 'text-yellow-600' : ''}>
                            {stats?.late_arrivals || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Early Departures:</span>
                          <span className={stats?.early_departures && stats.early_departures > 0 ? 'text-red-600' : ''}>
                            {stats?.early_departures || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No employees found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}
