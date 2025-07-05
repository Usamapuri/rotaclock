"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Clock,
  Calendar,
  LogOut,
  RefreshCw,
  Send,
  MessageSquare,
  Bell,
  CalendarDays,
  Users,
  AlertCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SwapRequests } from "@/components/ui/swap-requests"
import { LeaveRequests } from "@/components/ui/leave-requests"
import { AuthService } from "@/lib/auth"

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string
  shiftName: string
  status: "scheduled" | "confirmed" | "swap-requested" | "completed"
  canSwap: boolean
}

interface SwapRequest {
  id: string
  targetEmployeeName: string
  originalShift: {
    date: string
    shiftName: string
    time: string
  }
  targetShift: {
    date: string
    shiftName: string
    time: string
  }
  reason: string
  status: "pending" | "approved" | "denied"
  submittedAt: string
}

interface Message {
  id: string
  from: string
  subject: string
  content: string
  timestamp: string
  read: boolean
  type: "announcement" | "schedule" | "personal"
}

export default function EmployeeScheduling() {
  const [employeeId, setEmployeeId] = useState("")
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  // Sample data
  const [myShifts] = useState<Shift[]>([
    {
      id: "1",
      date: "2024-01-08",
      startTime: "09:00",
      endTime: "17:00",
      shiftName: "Day Shift",
      status: "confirmed",
      canSwap: true,
    },
    {
      id: "2",
      date: "2024-01-09",
      startTime: "14:00",
      endTime: "22:00",
      shiftName: "Evening Shift",
      status: "scheduled",
      canSwap: true,
    },
    {
      id: "3",
      date: "2024-01-10",
      startTime: "09:00",
      endTime: "17:00",
      shiftName: "Day Shift",
      status: "confirmed",
      canSwap: false,
    },
  ])

  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([
    {
      id: "1",
      targetEmployeeName: "Jane Smith",
      originalShift: {
        date: "2024-01-10",
        shiftName: "Day Shift",
        time: "09:00-17:00",
      },
      targetShift: {
        date: "2024-01-11",
        shiftName: "Evening Shift",
        time: "14:00-22:00",
      },
      reason: "Personal appointment",
      status: "pending",
      submittedAt: "2024-01-09T16:00:00Z",
    },
  ])

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      from: "Management",
      subject: "Schedule Update - Week of Jan 8",
      content: "Your schedule for next week has been updated. Please review and confirm your shifts.",
      timestamp: "2024-01-07T10:00:00Z",
      read: false,
      type: "schedule",
    },
    {
      id: "2",
      from: "HR Department",
      subject: "Holiday Schedule Reminder",
      content:
        "Please remember that no shifts are scheduled during company holidays. Check the holiday calendar for details.",
      timestamp: "2024-01-06T14:30:00Z",
      read: true,
      type: "announcement",
    },
    {
      id: "3",
      from: "Jane Smith",
      subject: "Shift Swap Request",
      content:
        "Hi! I'd like to swap my evening shift on Jan 11 with your day shift on Jan 10. Let me know if this works for you.",
      timestamp: "2024-01-05T16:45:00Z",
      read: false,
      type: "personal",
    },
  ])

  const [leaveBalance] = useState({
    vacation: 15,
    sick: 5,
    personal: 3,
  })

  const [showSwapForm, setShowSwapForm] = useState(false)
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<string | null>(null)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user) {
      router.push("/employee/login")
    } else {
      setCurrentUser(user)
      setEmployeeId(user.id)
    }
  }, [router])

  const handleLogout = () => {
    AuthService.logout()
    router.push("/employee/login")
  }

  const handleSwapRequest = (shiftId: string) => {
    setSelectedShiftForSwap(shiftId)
    setShowSwapForm(true)
  }

  const handleConfirmShift = (shiftId: string) => {
    // In a real app, this would update the shift status via API
    console.log(`Confirming shift ${shiftId}`)
    alert("Shift confirmed!")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default"
      case "scheduled":
        return "secondary"
      case "swap-requested":
        return "destructive"
      case "completed":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default">Confirmed</Badge>
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>
      case "swap-requested":
        return <Badge variant="destructive">Swap Requested</Badge>
      case "completed":
        return <Badge variant="outline">Completed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    return timeString
  }

  const unreadMessagesCount = messages.filter((msg) => !msg.read).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-2 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Employee Scheduling
                </h1>
                <p className="text-sm text-gray-500">
                  Manage your shifts and requests
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                {unreadMessagesCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadMessagesCount}
                  </Badge>
                )}
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
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="schedule">My Schedule</TabsTrigger>
            <TabsTrigger value="swap-requests">Swap Requests</TabsTrigger>
            <TabsTrigger value="leave-requests">Leave Requests</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {/* My Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Schedule */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      My Schedule
                    </CardTitle>
                    <CardDescription>
                      View and manage your upcoming shifts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {myShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <Clock className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{shift.shiftName}</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(shift.date)} • {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(shift.status)}
                            {shift.canSwap && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSwapRequest(shift.id)}
                              >
                                Request Swap
                              </Button>
                            )}
                            {shift.status === "scheduled" && (
                              <Button
                                size="sm"
                                onClick={() => handleConfirmShift(shift.id)}
                              >
                                Confirm
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Leave Balance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Leave Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Vacation</span>
                        <span className="font-medium">{leaveBalance.vacation} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Sick Leave</span>
                        <span className="font-medium">{leaveBalance.sick} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Personal</span>
                        <span className="font-medium">{leaveBalance.personal} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      View Full Schedule
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Team Schedule
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Report Issue
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Swap Requests Tab */}
          <TabsContent value="swap-requests">
            <SwapRequests />
          </TabsContent>

          {/* Leave Requests Tab */}
          <TabsContent value="leave-requests">
            <LeaveRequests />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messages & Notifications
                </CardTitle>
                <CardDescription>
                  Stay updated with important announcements and communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 border rounded-lg ${
                        !message.read ? "bg-blue-50 border-blue-200" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium">{message.from}</span>
                            <Badge
                              variant={
                                message.type === "announcement"
                                  ? "default"
                                  : message.type === "schedule"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {message.type}
                            </Badge>
                            {!message.read && (
                              <Badge variant="destructive">New</Badge>
                            )}
                          </div>
                          <h4 className="font-medium mb-1">{message.subject}</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {message.content}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
