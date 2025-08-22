"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Users, 
  Settings, 
  Plus, 
  RefreshCw,
  Download,
  Upload
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/lib/auth'
import { toast } from 'sonner'

// Import our custom components
import EmployeeList from '@/components/scheduling/EmployeeList'
import WeekGrid from '@/components/scheduling/WeekGrid'
import ShiftAssignmentModal from '@/components/scheduling/ShiftAssignmentModal'
import ShiftTemplateModal from '@/components/scheduling/ShiftTemplateModal'

interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  assignments: { [date: string]: any[] }
}

interface ShiftTemplate {
  id: string
  name: string
  start_time: string
  end_time: string
  department: string
  color: string
  required_staff: number
}

export default function NewSchedulingDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Modal states
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null)
  
  // Assignment state
  const [assignmentEmployeeId, setAssignmentEmployeeId] = useState('')
  const [assignmentDate, setAssignmentDate] = useState('')
  
  const router = useRouter()

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
      await Promise.all([
        loadEmployees(),
        loadTemplates(),
        loadWeekSchedule()
      ])
    } catch (error) {
      console.error('Error loading scheduling data:', error)
      toast.error('Failed to load scheduling data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/scheduling/employees')
      const data = await response.json()
      
      if (data.success) {
        const employeesWithAssignments = data.data.map((emp: any) => ({
          ...emp,
          assignments: {}
        }))
        setEmployees(employeesWithAssignments)
      } else {
        toast.error('Failed to load employees')
      }
    } catch (error) {
      console.error('Error loading employees:', error)
      toast.error('Failed to load employees')
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/scheduling/templates')
      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.data)
      } else {
        toast.error('Failed to load shift templates')
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Failed to load shift templates')
    }
  }

  const loadWeekSchedule = async () => {
    try {
      const response = await fetch(`/api/scheduling/week/${selectedDate}`)
      const data = await response.json()
      
      if (data.success) {
        // Update employees with their assignments
        setEmployees(prevEmployees => 
          prevEmployees.map(emp => {
            const weekEmployee = data.data.employees.find((e: any) => e.id === emp.id)
            return {
              ...emp,
              assignments: weekEmployee?.assignments || {}
            }
          })
        )
      } else {
        toast.error('Failed to load week schedule')
      }
    } catch (error) {
      console.error('Error loading week schedule:', error)
      toast.error('Failed to load week schedule')
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadSchedulingData()
    setIsRefreshing(false)
    toast.success('Schedule refreshed')
  }

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee)
  }

  const handleAssignShift = (employeeId: string, date: string) => {
    setAssignmentEmployeeId(employeeId)
    setAssignmentDate(date)
    setShowAssignmentModal(true)
  }

  const handleRemoveShift = (assignmentId: string) => {
    // Remove the assignment from the local state
    setEmployees(prevEmployees => 
      prevEmployees.map(emp => {
        const updatedAssignments = { ...emp.assignments }
        Object.keys(updatedAssignments).forEach(dateKey => {
          updatedAssignments[dateKey] = updatedAssignments[dateKey].filter(
            (assignment: any) => assignment.id !== assignmentId
          )
        })
        return {
          ...emp,
          assignments: updatedAssignments
        }
      })
    )
    toast.success('Shift assignment removed')
  }

  const handleAssignmentCreated = async () => {
    await loadWeekSchedule()
    toast.success('Shift assigned successfully')
  }

  const handleTemplateSaved = () => {
    loadTemplates()
    toast.success('Shift template saved successfully')
  }

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setShowTemplateModal(true)
  }

  const handleEditTemplate = (template: ShiftTemplate) => {
    setEditingTemplate(template)
    setShowTemplateModal(true)
  }

  const handleDateChange = async (date: string) => {
    setSelectedDate(date)
    await loadWeekSchedule()
  }

  const getWeekStats = () => {
    let totalAssignments = 0
    let totalEmployees = employees.length
    let assignedEmployees = 0

    employees.forEach(emp => {
      Object.values(emp.assignments).forEach((dayAssignments: any) => {
        totalAssignments += dayAssignments.length
      })
      
      if (Object.values(emp.assignments).some((dayAssignments: any) => dayAssignments.length > 0)) {
        assignedEmployees++
      }
    })

    return {
      totalAssignments,
      totalEmployees,
      assignedEmployees,
      coverageRate: totalEmployees > 0 ? Math.round((assignedEmployees / totalEmployees) * 100) : 0
    }
  }

  const stats = getWeekStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading scheduling dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduling Dashboard</h1>
          <p className="text-gray-600">Manage employee shifts and schedules</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            onClick={handleCreateTemplate}
          >
            <Settings className="h-4 w-4 mr-2" />
            Templates
          </Button>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Quick Assign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assigned Employees</p>
                <p className="text-2xl font-bold">{stats.assignedEmployees}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                <p className="text-2xl font-bold">{stats.totalAssignments}</p>
              </div>
              <Settings className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Coverage Rate</p>
                <p className="text-2xl font-bold">{stats.coverageRate}%</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">Week Schedule</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="templates">Shift Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Employee List Sidebar */}
            <div className="lg:col-span-1">
              <EmployeeList
                onEmployeeSelect={handleEmployeeSelect}
                selectedEmployeeId={selectedEmployee?.id}
              />
            </div>

            {/* Week Grid */}
            <div className="lg:col-span-3">
              <WeekGrid
                employees={employees}
                templates={templates}
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                onAssignShift={handleAssignShift}
                onRemoveShift={handleRemoveShift}
                onAssignmentCreated={handleAssignmentCreated}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Employee list is available in the sidebar</p>
                <p className="text-sm text-gray-500">Use the search and selection features there</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Shift Templates</CardTitle>
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: template.color }}
                      />
                      <h3 className="font-medium">{template.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {template.start_time} - {template.end_time}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{template.department}</Badge>
                      <Badge variant="outline">{template.required_staff} staff</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ShiftAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        employee={employees.find(emp => emp.id === assignmentEmployeeId) || null}
        date={assignmentDate}
        templates={templates}
        onAssignmentCreated={handleAssignmentCreated}
      />

      <ShiftTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        template={editingTemplate}
        onTemplateSaved={handleTemplateSaved}
      />
    </div>
  )
}
