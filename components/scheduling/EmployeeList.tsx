"use client"

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search, Users, User } from 'lucide-react'

interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  email: string
  department: string
  job_position: string
  is_active: boolean
  hourly_rate?: number
  max_hours_per_week?: number
}

interface EmployeeListProps {
  onEmployeeSelect?: (employee: Employee) => void
  selectedEmployeeId?: string
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

export default function EmployeeList({
  onEmployeeSelect,
  selectedEmployeeId,
  searchQuery = '',
  onSearchChange
}: EmployeeListProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(searchQuery)

  // Fetch employees
  useEffect(() => {
    fetchEmployees()
  }, [])

  // Filter employees based on search
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredEmployees(employees)
    } else {
      const filtered = employees.filter(emp =>
        emp.first_name.toLowerCase().includes(search.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        emp.department.toLowerCase().includes(search.toLowerCase())
      )
      setFilteredEmployees(filtered)
    }
    
    // Notify parent component of search change
    if (onSearchChange) {
      onSearchChange(search)
    }
  }, [search, employees, onSearchChange])

  const fetchEmployees = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const user = (await import('@/lib/auth')).AuthService.getCurrentUser()
      const response = await fetch('/api/scheduling/employees', {
        headers: {
          'authorization': user?.id ? `Bearer ${user.id}` : ''
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setEmployees(data.data)
      } else {
        setError(data.error || 'Failed to fetch employees')
      }
    } catch (err) {
      setError('Failed to fetch employees')
      console.error('Error fetching employees:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmployeeClick = (employee: Employee) => {
    if (onEmployeeSelect) {
      onEmployeeSelect(employee)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getDepartmentColor = (department: string) => {
    const colors: { [key: string]: string } = {
      'Sales': 'bg-blue-100 text-blue-800',
      'Support': 'bg-green-100 text-green-800',
      'Marketing': 'bg-purple-100 text-purple-800',
      'IT': 'bg-orange-100 text-orange-800',
      'HR': 'bg-pink-100 text-pink-800',
      'General': 'bg-gray-100 text-gray-800'
    }
    return colors[department] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-gray-500">Loading employees...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-red-500">{error}</div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchEmployees}
              className="ml-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Employees ({filteredEmployees.length})
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {filteredEmployees.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-500">
              {search ? 'No employees found' : 'No employees available'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  onClick={() => handleEmployeeClick(employee)}
                  className={`
                    flex items-center gap-3 p-3 cursor-pointer transition-colors
                    hover:bg-gray-50 border-l-4 border-transparent
                    ${selectedEmployeeId === employee.id 
                      ? 'bg-blue-50 border-l-blue-500' 
                      : 'hover:border-l-gray-300'
                    }
                  `}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(employee.first_name, employee.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {employee.first_name} {employee.last_name}
                      </p>
                      {employee.is_active && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500 truncate">
                        {employee.employee_code}
                      </p>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getDepartmentColor(employee.department)}`}
                      >
                        {employee.department}
                      </Badge>
                    </div>
                    
                    {employee.job_position && (
                      <p className="text-xs text-gray-400 truncate mt-1">
                        {employee.job_position}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
