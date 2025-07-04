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
    const storedEmployeeId = localStorage.getItem("employeeId")
    if (!storedEmployeeId) {
      router.push("/employee/login")
    } else {
      setEmployeeId(storedEmployeeId)
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("employeeId")
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

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "schedule":
        return <Calendar className="h-4 w-4 text-blue-500" />
      case "announcement":
        return <Bell className="h-4 w-4 text-yellow-500" />
      case "personal":
        return <MessageSquare className="h-4 w-4 text-green-500" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/employee/dashboard">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="text-xl font-bold text-gray-900">ShiftTracker</span>
                </div>
              </Link>
              <Badge variant="outline">My Schedule</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Employee {employeeId}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">This Week</p>
                  <p className="text-2xl font-bold">{myShifts.length}</p>
                  <p className="text-xs text-gray-500">shifts</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unread Messages</p>
                  <p className="text-2xl font-bold">{messages.filter((m) => !m.read).length}</p>
                  <p className="text-xs text-gray-500">messages</p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Vacation Days</p>
                  <p className="text-2xl font-bold">{leaveBalance.vacation}</p>
                  <p className="text-xs text-gray-500">remaining</p>
                </div>
                <CalendarDays className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Swap Requests</p>
                  <p className="text-2xl font-bold">{swapRequests.filter((r) => r.status === "pending").length}</p>
                  <p className="text-xs text-gray-500">pending</p>
                </div>
                <RefreshCw className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="schedule">My Schedule</TabsTrigger>
            <TabsTrigger value="swaps">Shift Swaps</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="leave">Leave Balance</TabsTrigger>
          </TabsList>

          {/* My Schedule */}
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Upcoming Shifts</CardTitle>
                <CardDescription>View and manage your scheduled shifts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myShifts.map((shift) => (
                    <div key={shift.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{shift.shiftName}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(shift.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {shift.startTime} - {shift.endTime}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(shift.status)}>{shift.status}</Badge>
                      </div>

                      <div className="flex space-x-2">
                        {shift.status === "scheduled" && (
                          <Button size="sm" onClick={() => handleConfirmShift(shift.id)}>
                            Confirm Shift
                          </Button>
                        )}
                        {shift.canSwap && (
                          <Button size="sm" variant="outline" onClick={() => handleSwapRequest(shift.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Request Swap
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Swap Request Form */}
            {showSwapForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Request Shift Swap</CardTitle>
                  <CardDescription>Find a colleague to swap shifts with</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div>
                      <Label htmlFor="target-employee">Swap With</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select colleague" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jane">Jane Smith</SelectItem>
                          <SelectItem value="mike">Mike Johnson</SelectItem>
                          <SelectItem value="sarah">Sarah Wilson</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reason">Reason for Swap</Label>
                      <Textarea id="reason" placeholder="Please explain why you need to swap shifts..." />
                    </div>

                    <div className="flex space-x-2">
                      <Button type="submit">
                        <Send className="h-4 w-4 mr-2" />
                        Send Request
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowSwapForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Shift Swaps */}
          <TabsContent value="swaps" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Swap Requests</CardTitle>
                <CardDescription>Track your shift swap requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {swapRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">Swap with {request.targetEmployeeName}</h4>
                          <p className="text-sm text-gray-600">
                            Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-3">
                        <div className="p-3 bg-blue-50 rounded">
                          <p className="text-sm font-medium text-blue-900">Your Shift</p>
                          <p className="text-sm text-blue-700">
                            {new Date(request.originalShift.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-blue-700">
                            {request.originalShift.shiftName} • {request.originalShift.time}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <p className="text-sm font-medium text-green-900">Their Shift</p>
                          <p className="text-sm text-green-700">
                            {new Date(request.targetShift.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-green-700">
                            {request.targetShift.shiftName} • {request.targetShift.time}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium">Reason:</p>
                        <p className="text-sm text-gray-600">{request.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Messages</CardTitle>
                <CardDescription>Communications and announcements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 border rounded-lg ${!message.read ? "bg-blue-50 border-blue-200" : ""}`}
                    >
                      <div className="flex items-start space-x-3">
                        {getMessageIcon(message.type)}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className={`font-semibold ${!message.read ? "text-blue-900" : ""}`}>
                                {message.subject}
                              </h4>
                              <p className="text-sm text-gray-600">From: {message.from}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                {new Date(message.timestamp).toLocaleDateString()}
                              </p>
                              {!message.read && (
                                <Badge variant="destructive" className="mt-1">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Balance */}
          <TabsContent value="leave" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Leave Balance</CardTitle>
                <CardDescription>Track your available time off</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-4 border rounded-lg text-center">
                    <CalendarDays className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Vacation Days</h3>
                    <p className="text-2xl font-bold text-blue-600">{leaveBalance.vacation}</p>
                    <p className="text-sm text-gray-600">days remaining</p>
                  </div>

                  <div className="p-4 border rounded-lg text-center">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Sick Days</h3>
                    <p className="text-2xl font-bold text-red-600">{leaveBalance.sick}</p>
                    <p className="text-sm text-gray-600">days remaining</p>
                  </div>

                  <div className="p-4 border rounded-lg text-center">
                    <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Personal Days</h3>
                    <p className="text-2xl font-bold text-green-600">{leaveBalance.personal}</p>
                    <p className="text-sm text-gray-600">days remaining</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900">Leave Policy Reminder</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Vacation days must be requested at least 2 weeks in advance. Sick days can be used as needed.
                        Personal days require manager approval.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
