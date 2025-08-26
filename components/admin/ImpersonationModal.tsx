"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, Search, User, AlertTriangle, CheckCircle } from 'lucide-react'
import { apiService } from '@/lib/api-service'
import { toast } from 'sonner'

interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department?: string
  position?: string
  role: string
  is_active: boolean
}

interface ImpersonationModalProps {
  isOpen: boolean
  onClose: () => void
  onImpersonate: (employee: Employee) => void
}

const roleColors = {
  admin: 'bg-red-100 text-red-800',
  team_lead: 'bg-blue-100 text-blue-800',
  project_manager: 'bg-purple-100 text-purple-800',
  employee: 'bg-green-100 text-green-800'
}

const roleLabels = {
  admin: 'Admin',
  team_lead: 'Team Lead',
  project_manager: 'Project Manager',
  employee: 'Employee'
}

export function ImpersonationModal({ isOpen, onClose, onImpersonate }: ImpersonationModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [departments, setDepartments] = useState<string[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadEmployees()
    }
  }, [isOpen])

  useEffect(() => {
    filterEmployees()
  }, [employees, searchTerm, selectedDepartment, selectedRole])

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const response = await apiService.get('/api/admin/employees')
      if (response.success) {
        const activeEmployees = response.employees.filter((emp: Employee) => emp.is_active)
        setEmployees(activeEmployees)
        
        // Extract unique departments
        const deptSet = new Set<string>()
        activeEmployees.forEach((emp: Employee) => {
          if (emp.department) deptSet.add(emp.department)
        })
        setDepartments(Array.from(deptSet).sort())
      }
    } catch (error) {
      console.error('Error loading employees:', error)
      toast.error('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const filterEmployees = () => {
    let filtered = employees

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(emp => 
        emp.first_name.toLowerCase().includes(term) ||
        emp.last_name.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term) ||
        emp.employee_id.toLowerCase().includes(term)
      )
    }

    // Filter by department
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.department === selectedDepartment)
    }

    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter(emp => emp.role === selectedRole)
    }

    setFilteredEmployees(filtered)
  }

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee)
  }

  const handleImpersonate = () => {
    if (selectedEmployee) {
      onImpersonate(selectedEmployee)
      onClose()
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Impersonate User
          </DialogTitle>
          <DialogDescription>
            Select an employee to impersonate. You will be able to view the system as that user.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, email, or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="team_lead">Team Lead</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Warning Banner */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Impersonation Warning
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    You will be able to view and interact with the system as the selected user. 
                    All actions will be logged for audit purposes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee List */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-96">
                {filteredEmployees.map((employee) => (
                  <Card
                    key={employee.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedEmployee?.id === employee.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleEmployeeSelect(employee)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-sm">
                            {getInitials(employee.first_name, employee.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {employee.first_name} {employee.last_name}
                            </h4>
                            {selectedEmployee?.id === employee.id && (
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 truncate">{employee.email}</p>
                          <p className="text-xs text-gray-500 mb-2">ID: {employee.employee_id}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${roleColors[employee.role as keyof typeof roleColors]}`}
                            >
                              {roleLabels[employee.role as keyof typeof roleLabels]}
                            </Badge>
                            {employee.department && (
                              <Badge variant="outline" className="text-xs">
                                {employee.department}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {!loading && filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No employees found matching your criteria.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleImpersonate}
              disabled={!selectedEmployee}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Impersonate {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : 'User'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
