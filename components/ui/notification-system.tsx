"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Bell, Calendar, Clock, Users, CheckCircle, X } from "lucide-react"

interface Notification {
  id: string
  type: "schedule" | "swap" | "leave" | "reminder" | "announcement"
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: "low" | "normal" | "high" | "urgent"
  actionRequired?: boolean
  actionUrl?: string
}

interface NotificationSettings {
  scheduleChanges: boolean
  shiftReminders: boolean
  swapRequests: boolean
  leaveApprovals: boolean
  announcements: boolean
  emailNotifications: boolean
  pushNotifications: boolean
}

interface NotificationSystemProps {
  userRole: "admin" | "employee"
  userId: string
}

export function NotificationSystem({ userRole, userId }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "schedule",
      title: "Schedule Updated",
      message: "Your schedule for next week has been updated. Please review your shifts.",
      timestamp: "2024-01-07T10:00:00Z",
      read: false,
      priority: "high",
      actionRequired: true,
      actionUrl: "/employee/scheduling",
    },
    {
      id: "2",
      type: "reminder",
      title: "Shift Reminder",
      message: "You have a shift starting in 1 hour (Day Shift - 09:00-17:00)",
      timestamp: "2024-01-08T08:00:00Z",
      read: false,
      priority: "normal",
    },
    {
      id: "3",
      type: "swap",
      title: "Shift Swap Request",
      message: "Jane Smith has requested to swap shifts with you for Jan 10th",
      timestamp: "2024-01-07T16:30:00Z",
      read: true,
      priority: "normal",
      actionRequired: true,
    },
  ])

  const [settings, setSettings] = useState<NotificationSettings>({
    scheduleChanges: true,
    shiftReminders: true,
    swapRequests: true,
    leaveApprovals: true,
    announcements: true,
    emailNotifications: true,
    pushNotifications: false,
  })

  const [showSettings, setShowSettings] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }

  const dismissNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "schedule":
        return <Calendar className="h-4 w-4 text-blue-500" />
      case "reminder":
        return <Clock className="h-4 w-4 text-orange-500" />
      case "swap":
        return <Users className="h-4 w-4 text-green-500" />
      case "leave":
        return <Calendar className="h-4 w-4 text-purple-500" />
      case "announcement":
        return <Bell className="h-4 w-4 text-yellow-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive"
      case "high":
        return "secondary"
      case "normal":
        return "outline"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Stay updated with important information</CardDescription>
          </div>
          <div className="flex space-x-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark All Read
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
              Settings
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notification Settings */}
        {showSettings && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-3">Notification Preferences</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Schedule Changes</label>
                <Switch
                  checked={settings.scheduleChanges}
                  onCheckedChange={(value) => updateSetting("scheduleChanges", value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Shift Reminders</label>
                <Switch
                  checked={settings.shiftReminders}
                  onCheckedChange={(value) => updateSetting("shiftReminders", value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Swap Requests</label>
                <Switch
                  checked={settings.swapRequests}
                  onCheckedChange={(value) => updateSetting("swapRequests", value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Leave Approvals</label>
                <Switch
                  checked={settings.leaveApprovals}
                  onCheckedChange={(value) => updateSetting("leaveApprovals", value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Announcements</label>
                <Switch
                  checked={settings.announcements}
                  onCheckedChange={(value) => updateSetting("announcements", value)}
                />
              </div>
              <hr />
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Email Notifications</label>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(value) => updateSetting("emailNotifications", value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Push Notifications</label>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(value) => updateSetting("pushNotifications", value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border rounded-lg ${!notification.read ? "bg-blue-50 border-blue-200" : ""}`}
            >
              <div className="flex items-start space-x-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className={`font-semibold ${!notification.read ? "text-blue-900" : ""}`}>
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600">{new Date(notification.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(notification.priority)}>{notification.priority}</Badge>
                      {notification.actionRequired && <Badge variant="destructive">Action Required</Badge>}
                      <Button variant="ghost" size="sm" onClick={() => dismissNotification(notification.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{notification.message}</p>

                  <div className="flex space-x-2">
                    {!notification.read && (
                      <Button size="sm" variant="outline" onClick={() => markAsRead(notification.id)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Read
                      </Button>
                    )}
                    {notification.actionRequired && notification.actionUrl && <Button size="sm">Take Action</Button>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No notifications</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
