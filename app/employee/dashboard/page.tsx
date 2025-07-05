"use client"

import { useState, useEffect } from 'react'

// Force dynamic rendering to prevent build issues
export const dynamic = 'force-dynamic'
export const revalidate = 0
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
  clock_in: string
  clock_out?: string
  break_start?: string
  break_end?: string
  total_hours: number
  status: 'in-progress' | 'completed' | 'break'
}

interface Shift {
  id: string
  name: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'in-progress' | 'completed'
}

export default function EmployeeDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentTimeEntry, setCurrentTimeEntry] = useState<TimeEntry | null>(null)
  const [todayShifts, setTodayShifts] = useState<Shift[]>([])
  const [showCamera, setShowCamera] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [weeklyHours, setWeeklyHours] = useState(0)
  const [maxWeeklyHours] = useState(40)
  
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
      // Mock data for demo
      setTodayShifts([
        {
          id: '1',
          name: 'Morning Shift',
          start_time: '08:00:00',
          end_time: '16:00:00',
          status: 'scheduled'
        }
      ])
      setWeeklyHours(32.5)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const handleClockIn = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newTimeEntry: TimeEntry = {
        id: Date.now().toString(),
        clock_in: new Date().toISOString(),
        total_hours: 0,
        status: 'in-progress'
      }
      
      setCurrentTimeEntry(newTimeEntry)
      toast.success('Successfully clocked in!')
    } catch (error) {
      toast.error('Failed to clock in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!currentTimeEntry) return
    
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const updatedEntry = {
        ...currentTimeEntry,
        clock_out: new Date().toISOString(),
        total_hours: 8.5, // Mock calculation
        status: 'completed' as const
      }
      
      setCurrentTimeEntry(updatedEntry)
      toast.success('Successfully clocked out!')
    } catch (error) {
      toast.error('Failed to clock out')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBreakStart = async () => {
    if (!currentTimeEntry) return
    
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const updatedEntry = {
        ...currentTimeEntry,
        break_start: new Date().toISOString(),
        status: 'break' as const
      }
      
      setCurrentTimeEntry(updatedEntry)
      toast.success('Break started!')
    } catch (error) {
      toast.error('Failed to start break')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBreakEnd = async () => {
    if (!currentTimeEntry) return
    
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const updatedEntry = {
        ...currentTimeEntry,
        break_end: new Date().toISOString(),
        status: 'in-progress' as const
      }
      
      setCurrentTimeEntry(updatedEntry)
      toast.success('Break ended!')
    } catch (error) {
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
                    <p className="text-2xl font-bold text-blue-600">{weeklyHours}h</p>
                    <p className="text-sm text-gray-500">of {maxWeeklyHours}h</p>
                  </div>
                  <Progress value={(weeklyHours / maxWeeklyHours) * 100} />
                  <p className="text-xs text-gray-500 text-center">
                    {maxWeeklyHours - weeklyHours}h remaining this week
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
