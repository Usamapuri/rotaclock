"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  ArrowLeft,
  Filter,
  Download
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
  hire_date: string
  hourly_rate: number
  is_active: boolean
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
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    position: '',
    hire_date: '',
    hourly_rate: ''
  })
  
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.first_name || !formData.last_name || !formData.email || 
        !formData.department || !formData.position || !formData.hire_date || !formData.hourly_rate) {
      toast.error('Please fill in all required fields')
      return
    }

    const newEmployee: Omit<Employee, 'id'> = {
      employee_id: `EMP${String(employees.length + 1).padStart(3, '0')}`,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      department: formData.department,
      position: formData.position,
      hire_date: formData.hire_date,
      hourly_rate: parseFloat(formData.hourly_rate),
      is_active: true
    }

    await handleAddEmployee(newEmployee)
    
    // Reset form
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      department: '',
      position: '',
      hire_date: '',
      hourly_rate: ''
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const departments = [...new Set(employees.map(emp => emp.department))]

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
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Employee Management
                </h1>
                <p className="text-sm text-gray-500">
                  Manage employee profiles and information
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setShowAddForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
              <p className="text-xs text-muted-foreground">
                {employees.filter((e) => e.is_active).length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.filter((e) => e.is_active).length}</div>
              <p className="text-xs text-muted-foreground">
                {employees.filter((e) => !e.is_active).length} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
              <p className="text-xs text-muted-foreground">
                Across all departments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <select
                  id="department"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => {
                    setSearchTerm('')
                    setDepartmentFilter('')
                    setStatusFilter('')
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Employees ({filteredEmployees.length})
            </CardTitle>
            <CardDescription>
              {employees.filter(emp => emp.is_active).length} active employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading employees...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No employees found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <Users className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </h4>
                        <p className="text-sm text-gray-500">{employee.email}</p>
                        <p className="text-sm text-gray-500">
                          ID: {employee.employee_id} • {employee.position} • {employee.department}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">${employee.hourly_rate}/hr</p>
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingEmployee(employee)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteEmployee(employee.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Employee Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New Employee</CardTitle>
              <CardDescription>Enter employee information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input 
                      id="first_name" 
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input 
                      id="last_name" 
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      required 
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <select 
                      id="department" 
                      className="w-full p-2 border rounded-md" 
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input 
                      id="position" 
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      required 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hire_date">Hire Date</Label>
                    <Input 
                      id="hire_date" 
                      type="date" 
                      value={formData.hire_date}
                      onChange={(e) => handleInputChange('hire_date', e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="hourly_rate">Hourly Rate</Label>
                    <Input 
                      id="hourly_rate" 
                      type="number" 
                      step="0.01" 
                      value={formData.hourly_rate}
                      onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                      required 
                    />
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
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
