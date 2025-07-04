"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Send, Bell, Calendar, AlertCircle } from "lucide-react"

interface Message {
  id: string
  from: string
  to: string
  subject: string
  content: string
  timestamp: string
  read: boolean
  type: "announcement" | "schedule" | "personal" | "urgent"
  priority: "low" | "normal" | "high" | "urgent"
}

interface TeamMessagingProps {
  userRole: "admin" | "employee"
  userId: string
}

export function TeamMessaging({ userRole, userId }: TeamMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      from: "Management",
      to: "All Staff",
      subject: "Schedule Update - Week of Jan 8",
      content: "Your schedule for next week has been updated. Please review and confirm your shifts.",
      timestamp: "2024-01-07T10:00:00Z",
      read: false,
      type: "schedule",
      priority: "high",
    },
    {
      id: "2",
      from: "HR Department",
      to: "All Staff",
      subject: "Holiday Schedule Reminder",
      content:
        "Please remember that no shifts are scheduled during company holidays. Check the holiday calendar for details.",
      timestamp: "2024-01-06T14:30:00Z",
      read: true,
      type: "announcement",
      priority: "normal",
    },
  ])

  const [showComposeForm, setShowComposeForm] = useState(false)
  const [newMessage, setNewMessage] = useState({
    to: "",
    subject: "",
    content: "",
    type: "personal" as const,
    priority: "normal" as const,
  })

  const handleSendMessage = () => {
    const message: Message = {
      id: Date.now().toString(),
      from: userRole === "admin" ? "Management" : `Employee ${userId}`,
      to: newMessage.to,
      subject: newMessage.subject,
      content: newMessage.content,
      timestamp: new Date().toISOString(),
      read: false,
      type: newMessage.type,
      priority: newMessage.priority,
    }

    setMessages([message, ...messages])
    setNewMessage({
      to: "",
      subject: "",
      content: "",
      type: "personal",
      priority: "normal",
    })
    setShowComposeForm(false)
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "schedule":
        return <Calendar className="h-4 w-4 text-blue-500" />
      case "announcement":
        return <Bell className="h-4 w-4 text-yellow-500" />
      case "urgent":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "personal":
        return <MessageSquare className="h-4 w-4 text-green-500" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Team Messages
            </CardTitle>
            <CardDescription>Communications and announcements</CardDescription>
          </div>
          <Button onClick={() => setShowComposeForm(true)}>
            <Send className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compose Message Form */}
        {showComposeForm && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-3">Compose Message</h4>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">To</label>
                  <Select value={newMessage.to} onValueChange={(value) => setNewMessage({ ...newMessage, to: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {userRole === "admin" && (
                        <>
                          <SelectItem value="all">All Staff</SelectItem>
                          <SelectItem value="department-sales">Sales Department</SelectItem>
                          <SelectItem value="department-support">Support Department</SelectItem>
                        </>
                      )}
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="hr">HR Department</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <Select
                    value={newMessage.priority}
                    onValueChange={(value: "low" | "normal" | "high" | "urgent") =>
                      setNewMessage({ ...newMessage, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <Input
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                  placeholder="Message subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <Textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  placeholder="Type your message here..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" onClick={() => setShowComposeForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Messages List */}
        <div className="space-y-3">
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
                      <h4 className={`font-semibold ${!message.read ? "text-blue-900" : ""}`}>{message.subject}</h4>
                      <p className="text-sm text-gray-600">
                        From: {message.from} • To: {message.to}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{new Date(message.timestamp).toLocaleDateString()}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={getPriorityColor(message.priority)}>{message.priority}</Badge>
                        {!message.read && <Badge variant="destructive">New</Badge>}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No messages yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
