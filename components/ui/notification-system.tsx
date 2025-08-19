"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Bell, Calendar, Clock, Users, CheckCircle, X } from "lucide-react"
import { AuthService } from "@/lib/auth"

interface Notification {
  id: string
  type: "schedule" | "swap" | "leave" | "reminder" | "announcement" | "info" | "success" | "warning" | "error" | "time"
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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
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

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        const formattedNotifications = (data.data || []).map((notification: any) => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          timestamp: notification.created_at,
          read: notification.read,
          priority: notification.priority || 'normal',
          actionRequired: notification.action_url ? true : false,
          actionUrl: notification.action_url
        }))
        setNotifications(formattedNotifications)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: true }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) => 
            notification.id === notificationId 
              ? { ...notification, read: true } 
              : notification
          )
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setNotifications((prev) => 
          prev.map((notification) => ({ ...notification, read: true }))
        )
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const dismissNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setNotifications((prev) => 
          prev.filter((notification) => notification.id !== notificationId)
        )
      }
    } catch (error) {
      console.error('Error dismissing notification:', error)
    }
  }

  const updateSetting = (setting: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [setting]: value }))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "schedule":
        return <Calendar className="h-5 w-5 text-blue-500" />
      case "reminder":
        return <Clock className="h-5 w-5 text-orange-500" />
      case "swap":
        return <Users className="h-5 w-5 text-green-500" />
      case "leave":
        return <Calendar className="h-5 w-5 text-purple-500" />
      case "announcement":
        return <Bell className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive"
      case "high":
        return "default"
      case "normal":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "secondary"
    }
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
      <CardContent>
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
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
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
                      {notification.actionRequired && notification.actionUrl && (
                        <Button size="sm" asChild>
                          <a href={notification.actionUrl}>Take Action</a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No notifications</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
