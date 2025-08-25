"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  User,
  Clock,
  Download,
  Key,
  Users,
  Building,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  Plus,
  Trash2,
  Eye,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Mail,
  Phone,
  MapPin
} from "lucide-react"
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
  is_online: boolean
  last_online?: string
  phone?: string
  address?: string
  emergency_contact?: string
  role?: string
  role_display_name?: string
  role_description?: string
  team_id?: string
  manager_id?: string
  max_hours_per_week?: number
  created_at: string
  updated_at: string
}

interface Role {
  id: number
  name: string
  display_name: string
  description: string
  permissions: any
  dashboard_access: string[]
  is_active: boolean
}

interface RoleAssignment {
  id: number
  employee_id: string
  employee_email: string
  old_role: string
  new_role: string
  assigned_by: string
  reason: string
  effective_date: string
  created_at: string
}

interface ShiftLog {
  id: string
  clock_in_time: string
  clock_out_time?: string
  total_shift_hours?: number
  break_time_used: number
  max_break_allowed: number
  is_late: boolean
  is_no_show: boolean
  late_minutes: number
  status: 'active' | 'completed' | 'cancelled'
  total_calls_taken?: number
  leads_generated?: number
  performance_rating?: number
  shift_remarks?: string
  created_at: string
}

interface Project {
  id: string
  name: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Team {
  id: string
  name: string
  department: string
  team_lead_id?: string
  team_lead_name?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

type TeamLead = any

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string
  
  const [adminUser, setAdminUser] = useState("")
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [roleHistory, setRoleHistory] = useState<RoleAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Employee>>({})
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false)
  const [showAssignProjectDialog, setShowAssignProjectDialog] = useState(false)
  const [showAssignTeamDialog, setShowAssignTeamDialog] = useState(false)
  const [showRoleAssignmentDialog, setShowRoleAssignmentDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState("")
  const [selectedTeam, setSelectedTeam] = useState("")
  const [selectedTeamLead, setSelectedTeamLead] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [roleAssignmentReason, setRoleAssignmentReason] = useState("")

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'admin') {
      router.push("/admin/login")
    } else {
      setAdminUser(user.email || 'Administrator')
      loadEmployeeData()
    }
  }, [router, employeeId])

  const loadEmployeeData = async () => {
    setIsLoading(true)
    try {
      // Load employee details
      const employeeResponse = await fetch(`/api/employees/${employeeId}`)
      console.log('Employee response status:', employeeResponse.status)
      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json()
        console.log('Employee API response:', employeeData)
        if (employeeData && employeeData.data && typeof employeeData.data === 'object') {
          console.log('Setting employee data:', employeeData.data)
          setEmployee(employeeData.data)
          setEditForm(employeeData.data)
        } else {
          console.error('Invalid employee data format:', employeeData)
          toast.error('Invalid employee data received')
        }
      } else {
        console.error('Failed to load employee:', employeeResponse.status)
        toast.error('Failed to load employee data')
      }

      // Load shift logs
      const shiftLogsResponse = await fetch(`/api/shift-logs/employee?employee_id=${employeeId}`)
      console.log('Shift logs response status:', shiftLogsResponse.status)
      if (shiftLogsResponse.ok) {
        const shiftLogsData = await shiftLogsResponse.json()
        console.log('Shift logs API response:', shiftLogsData)
        if (Array.isArray(shiftLogsData)) {
          setShiftLogs(shiftLogsData)
        } else {
          console.error('Invalid shift logs data format:', shiftLogsData)
          setShiftLogs([])
        }
      } else {
        console.error('Failed to load shift logs:', shiftLogsResponse.status)
        setShiftLogs([])
      }

      // Load projects
      const projectsResponse = await fetch('/api/projects')
      console.log('Projects response status:', projectsResponse.status)
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        console.log('Projects API response:', projectsData)
        if (projectsData && projectsData.success && Array.isArray(projectsData.data)) {
          setProjects(projectsData.data)
        } else {
          console.error('Invalid projects data format:', projectsData)
          setProjects([])
        }
      } else {
        console.error('Failed to load projects:', projectsResponse.status)
        setProjects([])
      }

      // Load teams
      const teamsResponse = await fetch('/api/teams')
      console.log('Teams response status:', teamsResponse.status)
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json()
        console.log('Teams API response:', teamsData)
        if (teamsData && teamsData.success && Array.isArray(teamsData.data)) {
          setTeams(teamsData.data)
        } else {
          console.error('Invalid teams data format:', teamsData)
          setTeams([])
        }
      } else {
        console.error('Failed to load teams:', teamsResponse.status)
        setTeams([])
      }

      // Load team leads
      const teamLeadsResponse = await fetch('/api/admin/team-leads')
      console.log('Team leads response status:', teamLeadsResponse.status)
      if (teamLeadsResponse.ok) {
        const teamLeadsData = await teamLeadsResponse.json()
        console.log('Team leads API response:', teamLeadsData)
        if (teamLeadsData && teamLeadsData.success && Array.isArray(teamLeadsData.data)) {
          setTeamLeads(teamLeadsData.data as TeamLead[])
        } else if (Array.isArray(teamLeadsData)) {
          setTeamLeads(teamLeadsData as TeamLead[])
        } else {
          console.error('Invalid team leads data format:', teamLeadsData)
          setTeamLeads([])
        }
      } else {
        console.error('Failed to load team leads:', teamLeadsResponse.status)
        setTeamLeads([])
      }

      // Load roles
      const rolesResponse = await fetch('/api/admin/roles')
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json()
        setRoles(rolesData)
      } else {
        console.error('Failed to load roles:', rolesResponse.status)
        setRoles([])
      }

      // Load role history if employee exists
      if (employee) {
        const roleHistoryResponse = await fetch(`/api/admin/employees/${employee.id}/role-history`)
        if (roleHistoryResponse.ok) {
          const roleHistoryData = await roleHistoryResponse.json()
          setRoleHistory(roleHistoryData)
        } else {
          console.error('Failed to load role history:', roleHistoryResponse.status)
          setRoleHistory([])
        }
      }

    } catch (error) {
      console.error('Error loading employee data:', error)
      toast.error('Failed to load employee data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveEmployee = async () => {
    if (!employee) return

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        const updatedEmployee = await response.json()
        setEmployee(updatedEmployee)
        setEditForm(updatedEmployee)
        setIsEditing(false)
        toast.success('Employee updated successfully')
      } else {
        toast.error('Failed to update employee')
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      toast.error('Failed to update employee')
    }
  }

  const handleResetPassword = async () => {
    if (!employee) return

    try {
      const response = await fetch(`/api/admin/employees/${employee.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Password reset successfully. New password: ${result.newPassword}`)
        setShowResetPasswordDialog(false)
      } else {
        toast.error('Failed to reset password')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      toast.error('Failed to reset password')
    }
  }

  const handleExportAttendance = async () => {
    if (!employee) return

    try {
      const response = await fetch(`/api/admin/employees/${employee.id}/export-attendance`, {
        method: 'GET',
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${employee.employee_id}_attendance.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Attendance data exported successfully')
      } else {
        toast.error('Failed to export attendance data')
      }
    } catch (error) {
      console.error('Error exporting attendance:', error)
      toast.error('Failed to export attendance data')
    }
  }

  const handleAssignProject = async () => {
    if (!employee || !selectedProject) return

    try {
      const response = await fetch('/api/admin/projects/assign-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: selectedProject,
          employee_id: employee.id,
        }),
      })

      if (response.ok) {
        toast.success('Project assigned successfully')
        setShowAssignProjectDialog(false)
        setSelectedProject("")
        loadEmployeeData() // Refresh data
      } else {
        toast.error('Failed to assign project')
      }
    } catch (error) {
      console.error('Error assigning project:', error)
      toast.error('Failed to assign project')
    }
  }

  const handleAssignTeam = async () => {
    if (!employee || !selectedTeam) return

    try {
      const response = await fetch(`/api/admin/teams/${selectedTeam}/assign-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: employee.id,
        }),
      })

      if (response.ok) {
        toast.success('Team assignment updated successfully')
        setShowAssignTeamDialog(false)
        setSelectedTeam("")
        loadEmployeeData() // Refresh data
      } else {
        toast.error('Failed to assign team')
      }
    } catch (error) {
      console.error('Error assigning team:', error)
      toast.error('Failed to assign team')
    }
  }

  const handleRoleAssignment = async () => {
    if (!employee || !selectedRole) return

    try {
      const response = await fetch(`/api/admin/employees/${employee.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_role: selectedRole,
          reason: roleAssignmentReason || 'Role assignment',
          assigned_by: adminUser
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Role updated successfully from ${result.old_role} to ${result.new_role}`)
        setShowRoleAssignmentDialog(false)
        setSelectedRole("")
        setRoleAssignmentReason("")
        loadEmployeeData() // Refresh data
      } else {
        toast.error('Failed to update role')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Failed to update role')
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid Date'
    }
  }

  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleTimeString()
    } catch (error) {
      console.error('Error formatting time:', error)
      return 'Invalid Time'
    }
  }

  const safeToFixed = (value: any, decimals: number = 1) => {
    if (typeof value === 'number' && !isNaN(value)) {
      return value.toFixed(decimals)
    }
    return '0.0'
  }

  const calculateTotalHours = () => {
    const total = shiftLogs.reduce((total, log) => {
      return total + (log.total_shift_hours || 0)
    }, 0)
    return typeof total === 'number' ? total : 0
  }

  const calculateAveragePerformance = () => {
    const ratedLogs = shiftLogs.filter(log => log.performance_rating && typeof log.performance_rating === 'number')
    if (ratedLogs.length === 0) return 0
    const total = ratedLogs.reduce((total, log) => total + (log.performance_rating || 0), 0)
    const average = total / ratedLogs.length
    return typeof average === 'number' ? average : 0
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading employee data...</p>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Employee Not Found</h2>
          <p className="text-gray-600 mb-4">The employee you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/admin/employees')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push('/admin/employees')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{employee.first_name} {employee.last_name}</h1>
            <p className="text-gray-600">{employee.employee_id} • {employee.position}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={employee.is_active ? "default" : "secondary"}>
            {employee.is_active ? "Active" : "Inactive"}
          </Badge>
          <Badge variant={employee.is_online ? "default" : "outline"}>
            {employee.is_online ? "Online" : "Offline"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Employee Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Employee Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={editForm.first_name || ""}
                        onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={editForm.last_name || ""}
                        onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editForm.email || ""}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Select value={editForm.department || ""} onValueChange={(value) => setEditForm({...editForm, department: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Support">Support</SelectItem>
                          <SelectItem value="Management">Management</SelectItem>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={editForm.position || ""}
                        onChange={(e) => setEditForm({...editForm, position: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                      <Input
                        id="hourly_rate"
                        type="number"
                        step="0.01"
                        value={editForm.hourly_rate || ""}
                        onChange={(e) => setEditForm({...editForm, hourly_rate: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={handleSaveEmployee} className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                      <p>{employee.first_name} {employee.last_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Email</Label>
                      <p>{employee.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Department</Label>
                      <p>{employee.department}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Position</Label>
                      <p>{employee.position}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Hourly Rate</Label>
                      <p>${employee.hourly_rate}/hr</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Hire Date</Label>
                      <p>{formatDate(employee.hire_date)}</p>
                    </div>
                    <Button onClick={() => setIsEditing(true)} className="w-full">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Information
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowResetPasswordDialog(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleExportAttendance}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Attendance
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowRoleAssignmentDialog(true)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Assign Role
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowAssignProjectDialog(true)}
                >
                  <Building className="h-4 w-4 mr-2" />
                  Assign Project
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowAssignTeamDialog(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign Team
                </Button>
              </CardContent>
            </Card>

            {/* Statistics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Current Role</span>
                  <span className="font-semibold">{employee.role_display_name || employee.role || 'Not Assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Hours Worked</span>
                  <span className="font-semibold">{safeToFixed(calculateTotalHours())}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Shift Logs</span>
                  <span className="font-semibold">{shiftLogs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Performance</span>
                  <span className="font-semibold">{safeToFixed(calculateAveragePerformance())}/5</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Online</span>
                  <span className="font-semibold">
                    {employee.last_online ? formatTime(employee.last_online) : 'Never'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Attendance History
              </CardTitle>
              <CardDescription>
                Recent shift logs and attendance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftLogs.slice(0, 10).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.clock_in_time)}</TableCell>
                      <TableCell>{formatTime(log.clock_in_time)}</TableCell>
                      <TableCell>
                        {log.clock_out_time ? formatTime(log.clock_out_time) : '-'}
                      </TableCell>
                      <TableCell>{safeToFixed(log.total_shift_hours)}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'completed' ? 'default' : 'secondary'}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.performance_rating ? `${log.performance_rating}/5` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Project Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="p-4">
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant={project.is_active ? 'default' : 'secondary'}>
                        {project.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {formatDate(project.created_at)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <Card key={team.id} className="p-4">
                    <h3 className="font-semibold">{team.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{team.department}</p>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant={team.is_active ? 'default' : 'secondary'}>
                        {team.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {team.team_lead_name && (
                          <span>Lead: {team.team_lead_name}</span>
                        )}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {safeToFixed(calculateTotalHours())}
                  </div>
                  <div className="text-sm text-gray-600">Total Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {safeToFixed(calculateAveragePerformance())}
                  </div>
                  <div className="text-sm text-gray-600">Avg Performance</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {shiftLogs.filter(log => log.is_late).length}
                  </div>
                  <div className="text-sm text-gray-600">Late Arrivals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Account Status</h3>
                  <p className="text-sm text-gray-600">Enable or disable employee account</p>
                </div>
                <Select 
                  value={employee.is_active ? "active" : "inactive"} 
                  onValueChange={(value) => setEditForm({...editForm, is_active: value === "active"})}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Password Reset</h3>
                  <p className="text-sm text-gray-600">Reset employee password to default</p>
                </div>
                <Button variant="outline" onClick={() => setShowResetPasswordDialog(true)}>
                  <Key className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Employee Password</DialogTitle>
            <DialogDescription>
              This will reset {employee.first_name}'s password to the default password. 
              They will need to change it on their next login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>
              <Key className="h-4 w-4 mr-2" />
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Project Dialog */}
      <Dialog open={showAssignProjectDialog} onOpenChange={setShowAssignProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Project</DialogTitle>
            <DialogDescription>
              Assign {employee.first_name} to a project as a team member or manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project">Select Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignProjectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignProject} disabled={!selectedProject}>
              <Building className="h-4 w-4 mr-2" />
              Assign Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Team Dialog */}
      <Dialog open={showAssignTeamDialog} onOpenChange={setShowAssignTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Team</DialogTitle>
            <DialogDescription>
              Assign {employee.first_name} to a team or make them a team lead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team">Select Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignTeamDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTeam} disabled={!selectedTeam}>
              <Users className="h-4 w-4 mr-2" />
              Assign Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Assignment Dialog */}
      <Dialog open={showRoleAssignmentDialog} onOpenChange={setShowRoleAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Change {employee.first_name}'s role. This will update their permissions and dashboard access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-role">Current Role</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="font-medium">{employee.role_display_name || employee.role || 'Not Assigned'}</span>
                {employee.role_description && (
                  <p className="text-sm text-gray-600 mt-1">{employee.role_description}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="new-role">New Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a new role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      <div>
                        <div className="font-medium">{role.display_name}</div>
                        <div className="text-sm text-gray-500">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reason">Reason for Change</Label>
              <Input
                id="reason"
                placeholder="e.g., Promotion, Role change, etc."
                value={roleAssignmentReason}
                onChange={(e) => setRoleAssignmentReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleAssignmentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRoleAssignment} disabled={!selectedRole}>
              <Shield className="h-4 w-4 mr-2" />
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role History Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <FileText className="h-4 w-4 mr-2" />
            View Role History
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Role Assignment History</DialogTitle>
            <DialogDescription>
              Complete history of role changes for {employee.first_name}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Old Role</TableHead>
                  <TableHead>New Role</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleHistory.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>{formatDate(assignment.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{assignment.old_role || 'None'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{assignment.new_role}</Badge>
                    </TableCell>
                    <TableCell>{assignment.assigned_by}</TableCell>
                    <TableCell>{assignment.reason}</TableCell>
                  </TableRow>
                ))}
                {roleHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      No role history available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
