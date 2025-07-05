"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CameraVerification } from '@/components/ui/camera-verification'
import { 
  Clock, 
  Calendar, 
  User, 
  TrendingUp, 
  Camera,
  Play,
  Pause,
  Square,
  Coffee,
  LogOut
} from 'lucide-react'
import { AuthService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface TimeEntry {
  id: string
  employee_id: string
  clock_in: string
  clock_out?: string
  break_start?: string
  break_end?: string
  total_hours: number
  status: 'in-progress' | 'completed' | 'break'
  created_at: string
}

interface Shift {
  id: string
  name: string
  start_time: string
  end_time: string
  date: string
  status: 'scheduled' | 'in-progress' | 'completed'
  employee_id: string
}

export default function EmployeeDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentTimeEntry, setCurrentTimeEntry] = useState<TimeEntry | null>(null)
  const [todayShifts, setTodayShifts] = useState<Shift[]>([])
  const [showCamera, setShowCamera] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [weeklyHours, setWeeklyHours] = useState(0)
  const [maxWeeklyHours] = useState(40)
  const [isLoadingData, setIsLoadingData] = useState(true)
  
  const router = useRouter()

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user) {
      router.push('/employee/login')
      return
    }
    setCurrentUser(user)
    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    try {
      setIsLoadingData(true)
      const user = AuthService.getCurrentUser()
      if (!user) return

      // Load current time entry
      const timeResponse = await fetch('/api/time/entries')
      if (timeResponse.ok) {
        const timeEntries = await timeResponse.json()
        const currentEntry = timeEntries.find((entry: TimeEntry) => 
          entry.employee_id === user.id && 
          (entry.status === 'in-progress' || entry.status === 'break')
        )
        setCurrentTimeEntry(currentEntry || null)
      }

      // Load today's shifts
      const today = new Date().toISOString().split('T')[0]
      const shiftsResponse = await fetch(`/api/shifts?date=${today}&employee_id=${user.id}`)
      if (shiftsResponse.ok) {
        const shifts = await shiftsResponse.json()
        setTodayShifts(shifts)
      }

      // Load weekly hours
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const weeklyResponse = await fetch(`/api/time/entries?start_date=${weekStart.toISOString().split('T')[0]}&end_date=${weekEnd.toISOString().split('T')[0]}&employee_id=${user.id}`)
      if (weeklyResponse.ok) {
        const weeklyEntries = await weeklyResponse.json()
        const totalHours = weeklyEntries.reduce((sum: number, entry: TimeEntry) => sum + (entry.total_hours || 0), 0)
        setWeeklyHours(totalHours)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleClockIn = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/time/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: currentUser.id,
        }),
      })

      if (response.ok) {
        const newTimeEntry = await response.json()
        setCurrentTimeEntry(newTimeEntry)
        toast.success('Successfully clocked in!')
        await loadDashboardData() // Refresh data
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to clock in')
      }
    } catch (error) {
      console.error('Error clocking in:', error)
      toast.error('Failed to clock in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!currentTimeEntry) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/time/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: currentUser.id,
        }),
      })

      if (response.ok) {
        const updatedEntry = await response.json()
        setCurrentTimeEntry(updatedEntry)
        toast.success('Successfully clocked out!')
        await loadDashboardData() // Refresh data
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to clock out')
      }
    } catch (error) {
      console.error('Error clocking out:', error)
      toast.error('Failed to clock out')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBreakStart = async () => {
    if (!currentTimeEntry) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/time/break-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: currentUser.id,
        }),
      })

      if (response.ok) {
        const updatedEntry = await response.json()
        setCurrentTimeEntry(updatedEntry)
        toast.success('Break started!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to start break')
      }
    } catch (error) {
      console.error('Error starting break:', error)
      toast.error('Failed to start break')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBreakEnd = async () => {
    if (!currentTimeEntry) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/time/break-end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: currentUser.id,
        }),
      })

      if (response.ok) {
        const updatedEntry = await response.json()
        setCurrentTimeEntry(updatedEntry)
        toast.success('Break ended!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to end break')
      }
    } catch (error) {
      console.error('Error ending break:', error)
      toast.error('Failed to end break')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCameraVerification = (success: boolean, imageData?: string) => {
    setShowCamera(false)
    if (success) {
      toast.success('Identity verified! Starting shift...')
      handleClockIn()
    } else {
      toast.error('Verification failed. Please try again.')
    }
  }

  const handleLogout = () => {
    AuthService.logout()
    router.push('/employee/login')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>
      case 'in-progress':
        return <Badge variant="default">In Progress</Badge>
      case 'completed':
        return <Badge variant="outline">Completed</Badge>
      case 'break':
        return <Badge variant="destructive">On Break</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const isClockedIn = currentTimeEntry?.status === 'in-progress'
  const isOnBreak = currentTimeEntry?.status === 'break'
  const isClockedOut = currentTimeEntry?.status === 'completed'

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Welcome back, {currentUser?.email || 'Employee'}!
                </h1>
                <p className="text-sm text-gray-500">Employee Dashboard</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Time Tracking Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Time Tracking
                </CardTitle>
                <CardDescription>
                  Track your work hours and breaks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!currentTimeEntry ? (
                  <div className="text-center space-y-4">
                    <div className="bg-gray-100 p-8 rounded-lg">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Ready to start your shift?</p>
                      <Button 
                        onClick={() => setShowCamera(true)}
                        className="w-full"
                        size="lg"
                        disabled={isLoading}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Start Shift with Verification
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-blue-900">
                          {isClockedIn && 'Currently Working'}
                          {isOnBreak && 'Currently on Break'}
                          {isClockedOut && 'Shift Completed'}
                        </p>
                        <p className="text-sm text-blue-700">
                          {currentTimeEntry.clock_in && 
                            `Started: ${new Date(currentTimeEntry.clock_in).toLocaleTimeString()}`
                          }
                        </p>
                      </div>
                      {getStatusBadge(currentTimeEntry.status)}
                    </div>

                    <div className="flex gap-2">
                      {isClockedIn && (
                        <>
                          <Button 
                            onClick={handleBreakStart}
                            disabled={isLoading}
                            variant="outline"
                            className="flex-1"
                          >
                            <Coffee className="h-4 w-4 mr-2" />
                            Start Break
                          </Button>
                          <Button 
                            onClick={handleClockOut}
                            disabled={isLoading}
                            variant="destructive"
                            className="flex-1"
                          >
                            <Square className="h-4 w-4 mr-2" />
                            Clock Out
                          </Button>
                        </>
                      )}
                      {isOnBreak && (
                        <Button 
                          onClick={handleBreakEnd}
                          disabled={isLoading}
                          className="flex-1"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          End Break
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Shifts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayShifts.length > 0 ? (
                  <div className="space-y-3">
                    {todayShifts.map((shift) => (
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
                ) : (
                  <p className="text-gray-500 text-center py-4">No shifts scheduled for today</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Weekly Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{weeklyHours.toFixed(1)}h</p>
                    <p className="text-sm text-gray-500">of {maxWeeklyHours}h</p>
                  </div>
                  <Progress value={(weeklyHours / maxWeeklyHours) * 100} />
                  <p className="text-xs text-gray-500 text-center">
                    {(maxWeeklyHours - weeklyHours).toFixed(1)}h remaining this week
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => router.push('/employee/scheduling')}
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Button>
                <Button 
                  onClick={() => router.push('/employee/profile')}
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <User className="h-4 w-4 mr-2" />
                  Update Profile
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Time History
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Camera Verification Modal */}
      {showCamera && (
        <CameraVerification
          onVerificationComplete={handleCameraVerification}
          onCancel={() => setShowCamera(false)}
          title="Shift Verification"
          description="Please verify your identity to start your shift."
        />
      )}
    </div>
  )
}
