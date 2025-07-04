"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MessageSquare, CalendarDays } from "lucide-react"

interface DashboardWidgetsProps {
  preferences: {
    showUpcomingShifts: boolean
    showHoursSummary: boolean
    showMessages: boolean
    showLeaveBalance: boolean
  }
}

export function EmployeeDashboardWidgets({ preferences }: DashboardWidgetsProps) {
  const upcomingShifts = [
    {
      id: "1",
      date: "2024-01-08",
      shiftName: "Day Shift",
      time: "09:00-17:00",
      status: "confirmed",
    },
    {
      id: "2",
      date: "2024-01-09",
      shiftName: "Evening Shift",
      time: "14:00-22:00",
      status: "scheduled",
    },
  ]

  const recentMessages = [
    {
      id: "1",
      from: "Management",
      subject: "Schedule Update",
      timestamp: "2024-01-07T10:00:00Z",
      read: false,
    },
    {
      id: "2",
      from: "HR Department",
      subject: "Holiday Reminder",
      timestamp: "2024-01-06T14:30:00Z",
      read: true,
    },
  ]

  const leaveBalance = {
    vacation: 15,
    sick: 5,
    personal: 3,
  }

  const hoursSummary = {
    thisWeek: 32,
    thisMonth: 128,
    total: 1456,
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Upcoming Shifts Widget */}
      {preferences.showUpcomingShifts && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Upcoming Shifts
            </CardTitle>
            <CardDescription>Your scheduled shifts for this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingShifts.map((shift) => (
                <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {new Date(shift.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-gray-600">{shift.shiftName}</p>
                    <p className="text-sm text-gray-600">{shift.time}</p>
                  </div>
                  <Badge variant={shift.status === "confirmed" ? "default" : "secondary"}>{shift.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hours Summary Widget */}
      {preferences.showHoursSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Hours Summary
            </CardTitle>
            <CardDescription>Your working hours breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{hoursSummary.thisWeek}</p>
                <p className="text-sm text-gray-600">This Week</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{hoursSummary.thisMonth}</p>
                <p className="text-sm text-gray-600">This Month</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{hoursSummary.total}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages Widget */}
      {preferences.showMessages && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Recent Messages
              {recentMessages.filter((m) => !m.read).length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {recentMessages.filter((m) => !m.read).length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Latest team communications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMessages.map((message) => (
                <div key={message.id} className={`p-3 border rounded-lg ${!message.read ? "bg-blue-50" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-medium ${!message.read ? "text-blue-900" : ""}`}>{message.subject}</p>
                      <p className="text-sm text-gray-600">From: {message.from}</p>
                      <p className="text-xs text-gray-500">{new Date(message.timestamp).toLocaleDateString()}</p>
                    </div>
                    {!message.read && <Badge variant="destructive">New</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Balance Widget */}
      {preferences.showLeaveBalance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="h-5 w-5 mr-2" />
              Leave Balance
            </CardTitle>
            <CardDescription>Your available time off days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{leaveBalance.vacation}</p>
                <p className="text-sm text-gray-600">Vacation</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <p className="text-2xl font-bold text-red-600">{leaveBalance.sick}</p>
                <p className="text-sm text-gray-600">Sick</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <p className="text-2xl font-bold text-green-600">{leaveBalance.personal}</p>
                <p className="text-sm text-gray-600">Personal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
