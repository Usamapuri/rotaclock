"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { RefreshCw, Users, Clock, Coffee } from 'lucide-react'
import { toast } from 'sonner'

interface OnlineEmployee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  is_online: boolean
  last_online: string
  shift_log_id: string
  clock_in_time: string
  shift_status: string
  shift_duration: string
  total_shift_hours: number
  break_time_used: number
}

interface OnlineEmployeesProps {
  refreshInterval?: number // in milliseconds
  showRefreshButton?: boolean
  maxDisplay?: number
}

export function OnlineEmployees({ 
  refreshInterval = 30000, // 30 seconds
  showRefreshButton = true,
  maxDisplay = 10
}: OnlineEmployeesProps) {
  const [onlineEmployees, setOnlineEmployees] = useState<OnlineEmployee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchOnlineEmployees = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/employees/online')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setOnlineEmployees(data.data.slice(0, maxDisplay))
          setLastUpdated(new Date())
        } else {
          toast.error('Failed to load online employees')
        }
      } else {
        toast.error('Failed to load online employees')
      }
    } catch (error) {
      console.error('Error fetching online employees:', error)
      toast.error('Failed to load online employees')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOnlineEmployees()

    // Set up auto-refresh
    const interval = setInterval(fetchOnlineEmployees, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, maxDisplay])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case 'break':
        return <Badge variant="outline" className="border-orange-200 text-orange-700">On Break</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const formatLastOnline = (lastOnline: string) => {
    const lastOnlineDate = new Date(lastOnline)
    const now = new Date()
    const diffMs = now.getTime() - lastOnlineDate.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            <CardTitle>Online Employees</CardTitle>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {onlineEmployees.length} online
            </Badge>
          </div>
          {showRefreshButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOnlineEmployees}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
        <CardDescription>
          Currently active employees and their shift status
          {lastUpdated && (
            <span className="block text-xs text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading...</span>
          </div>
        ) : onlineEmployees.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No employees online</p>
            <p className="text-sm text-gray-500 mt-1">Employees will appear here when they clock in</p>
          </div>
        ) : (
          <div className="space-y-3">
            {onlineEmployees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {getInitials(employee.first_name, employee.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-sm text-gray-600">{employee.position}</p>
                    <p className="text-xs text-gray-500">{employee.department}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  {employee.shift_log_id ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {employee.shift_duration}
                        </span>
                      </div>
                      {employee.break_time_used > 0 && (
                        <div className="flex items-center gap-1">
                          <Coffee className="h-3 w-3 text-orange-600" />
                          <span className="text-xs text-gray-600">
                            {employee.break_time_used.toFixed(1)}h break
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {formatLastOnline(employee.last_online)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        No active shift
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatLastOnline(employee.last_online)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {onlineEmployees.length >= maxDisplay && (
              <div className="text-center py-2">
                <p className="text-xs text-gray-500">
                  Showing {maxDisplay} of {onlineEmployees.length} online employees
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
