"use client"

import { useState, useEffect } from 'react'

// Force dynamic rendering to prevent build issues - Build fix v3
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const preferredRegion = 'auto'
export const runtime = 'nodejs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Plus,
  LogOut,
  UserPlus,
  Settings,
  BarChart3
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

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  totalShifts: number
  completedShifts: number
  weeklyHours: number
  avgHoursPerEmployee: number
}

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalShifts: 0,
    completedShifts: 0,
    weeklyHours: 0,
    avgHoursPerEmployee: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  
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
          is_active: true
        }
      ]

      const mockShifts: Shift[] = [
        {
          id: '1',
          name: 'Morning Shift',
          start_time: '08:00:00',
          end_time: '16:00:00',
          status: 'scheduled'
        },
        {
          id: '2',
          name: 'Afternoon Shift',
          start_time: '12:00:00',
          end_time: '20:00:00',
          status: 'in-progress'
        },
        {
          id: '3',
          name: 'Night Shift',
          start_time: '20:00:00',
          end_time: '04:00:00',
          status: 'completed'
        }
      ]

      setEmployees(mockEmployees)
      setShifts(mockShifts)
      
      // Calculate stats
      setStats({
        totalEmployees: mockEmployees.length,
        activeEmployees: mockEmployees.filter(emp => emp.is_active).length,
        totalShifts: mockShifts.length,
        completedShifts: mockShifts.filter(shift => shift.status === 'completed').length,
        weeklyHours: 168, // Mock total weekly hours
        avgHoursPerEmployee: 40
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
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
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeEmployees} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalShifts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedShifts} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weeklyHours}h</div>
              <p className="text-xs text-muted-foreground">
                {stats.avgHoursPerEmployee}h avg per employee
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productivity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground">
                +2.1% from last week
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Employees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Employees</span>
                <Button onClick={() => router.push('/admin/employees')} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </CardTitle>
              <CardDescription>
                Latest employee additions and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employees.slice(0, 5).map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {employee.position} • {employee.department}
                      </p>
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
              <CardTitle className="flex items-center justify-between">
                <span>Recent Shifts</span>
                <Button onClick={() => router.push('/admin/scheduling')} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Shift
                </Button>
              </CardTitle>
              <CardDescription>
                Today's and upcoming shifts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shifts.slice(0, 5).map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{shift.name}</p>
                      <p className="text-sm text-gray-500">
                        {shift.start_time} - {shift.end_time}
                      </p>
                    </div>
                    {getStatusBadge(shift.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => router.push('/admin/employees')}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  variant="outline"
                >
                  <UserPlus className="h-6 w-6" />
                  <span>Manage Employees</span>
                </Button>
                <Button 
                  onClick={() => router.push('/admin/scheduling')}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  variant="outline"
                >
                  <Calendar className="h-6 w-6" />
                  <span>Schedule Shifts</span>
                </Button>
                <Button 
                  onClick={() => router.push('/admin/reports')}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  variant="outline"
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>View Reports</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
