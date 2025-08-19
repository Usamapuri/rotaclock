"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, UserPlus, Save, X } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"

interface EmployeeFormData {
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  role: string
  hire_date: string
  hourly_rate: number
  max_hours_per_week: number
  phone?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  notes?: string
}

const departments = [
  "Engineering",
  "Sales",
  "Marketing",
  "Human Resources",
  "Finance",
  "Operations",
  "Customer Support",
  "IT",
  "Administration"
]

const positions = [
  "Manager",
  "Senior Developer",
  "Developer",
  "Sales Representative",
  "Marketing Specialist",
  "HR Coordinator",
  "Accountant",
  "Operations Manager",
  "Customer Support Representative",
  "IT Support",
  "Administrative Assistant",
  "Intern"
]

const roles = [
  "employee",
  "team_lead", 
  "project_manager",
  "admin"
]

export default function NewEmployee() {
  const [formData, setFormData] = useState<EmployeeFormData>({
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    department: "",
    position: "",
    role: "employee",
    hire_date: new Date().toISOString().split('T')[0],
    hourly_rate: 0,
    max_hours_per_week: 40,
    phone: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
    notes: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [adminUser, setAdminUser] = useState("")
  const router = useRouter()

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'admin') {
      router.push("/admin/login")
    } else {
      setAdminUser(user.email || 'Administrator')
    }
  }, [router])

  const handleInputChange = (field: keyof EmployeeFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateEmployeeId = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `EMP${timestamp}${random}`
  }

  const handleGenerateId = () => {
    setFormData(prev => ({
      ...prev,
      employee_id: generateEmployeeId()
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.employee_id.trim()) {
      toast.error("Employee ID is required")
      return false
    }
    if (!formData.first_name.trim()) {
      toast.error("First name is required")
      return false
    }
    if (!formData.last_name.trim()) {
      toast.error("Last name is required")
      return false
    }
    if (!formData.email.trim()) {
      toast.error("Email is required")
      return false
    }
    if (!formData.department) {
      toast.error("Department is required")
      return false
    }
    if (!formData.position) {
      toast.error("Position is required")
      return false
    }
    if (!formData.role) {
      toast.error("Role is required")
      return false
    }
    if (!formData.hire_date) {
      toast.error("Hire date is required")
      return false
    }
    if (formData.hourly_rate <= 0) {
      toast.error("Hourly rate must be greater than 0")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          is_active: true,
          password: 'changeme123' // Default password that should be changed
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create employee')
      }

      const result = await response.json()
      toast.success(`Employee ${formData.first_name} ${formData.last_name} created successfully!`)
      router.push('/admin/employees')
    } catch (error) {
      console.error('Error creating employee:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create employee')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/employees')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin/employees">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Employees
                </Button>
              </Link>
              <div className="bg-blue-100 p-2 rounded-full">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Add New Employee
                </h1>
                <p className="text-sm text-gray-500">
                  Create a new employee account
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Admin: {adminUser}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
            <CardDescription>
              Fill in the employee details below. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="employee_id">Employee ID *</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="employee_id"
                        value={formData.employee_id}
                        onChange={(e) => handleInputChange('employee_id', e.target.value)}
                        placeholder="EMP001"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateId}
                        className="whitespace-nowrap"
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="john.doe@company.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="department">Department *</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => handleInputChange('department', value)}
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

                  <div>
                    <Label htmlFor="position">Position *</Label>
                    <Select
                      value={formData.position}
                      onValueChange={(value) => handleInputChange('position', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => handleInputChange('role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="hire_date">Hire Date *</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => handleInputChange('hire_date', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="hourly_rate">Hourly Rate ($) *</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value) || 0)}
                      placeholder="25.00"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_hours_per_week">Max Hours per Week</Label>
                    <Input
                      id="max_hours_per_week"
                      type="number"
                      min="1"
                      max="168"
                      value={formData.max_hours_per_week}
                      onChange={(e) => handleInputChange('max_hours_per_week', parseInt(e.target.value) || 40)}
                      placeholder="40"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="123 Main St, City, State 12345"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergency_contact">Emergency Contact</Label>
                    <Input
                      id="emergency_contact"
                      value={formData.emergency_contact}
                      onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="emergency_phone">Emergency Phone</Label>
                    <Input
                      id="emergency_phone"
                      value={formData.emergency_phone}
                      onChange={(e) => handleInputChange('emergency_phone', e.target.value)}
                      placeholder="+1 (555) 987-6543"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes about the employee..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Creating...' : 'Create Employee'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
