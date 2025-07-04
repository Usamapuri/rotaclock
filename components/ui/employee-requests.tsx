"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarX, Calendar, FileText, Send, X } from "lucide-react"

interface Request {
  id: string
  type: "timeoff" | "reschedule"
  startDate: string
  endDate?: string
  currentShiftDate?: string
  newShiftDate?: string
  reason: string
  status: "pending" | "approved" | "denied"
  submittedAt: string
  respondedAt?: string
  adminNotes?: string
}

interface EmployeeRequestsProps {
  employeeId: string
}

export function EmployeeRequests({ employeeId }: EmployeeRequestsProps) {
  const [activeTab, setActiveTab] = useState("submit")
  const [requestType, setRequestType] = useState<"timeoff" | "reschedule">("timeoff")
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    currentShiftDate: "",
    newShiftDate: "",
    reason: "",
    urgency: "normal",
  })

  // Sample existing requests
  const [requests] = useState<Request[]>([
    {
      id: "1",
      type: "timeoff",
      startDate: "2024-01-15",
      endDate: "2024-01-17",
      reason: "Family emergency",
      status: "pending",
      submittedAt: "2024-01-10T10:00:00Z",
    },
    {
      id: "2",
      type: "reschedule",
      currentShiftDate: "2024-01-10",
      newShiftDate: "2024-01-12",
      reason: "Medical appointment",
      status: "approved",
      submittedAt: "2024-01-08T14:30:00Z",
      respondedAt: "2024-01-09T09:15:00Z",
    },
    {
      id: "3",
      type: "timeoff",
      startDate: "2024-01-05",
      endDate: "2024-01-05",
      reason: "Personal day",
      status: "denied",
      submittedAt: "2024-01-03T16:20:00Z",
      respondedAt: "2024-01-04T11:45:00Z",
      adminNotes: "Insufficient coverage for that date",
    },
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would submit to an API
    console.log("Submitting request:", { type: requestType, ...formData })

    // Reset form
    setFormData({
      startDate: "",
      endDate: "",
      currentShiftDate: "",
      newShiftDate: "",
      reason: "",
      urgency: "normal",
    })

    // Show success message or redirect
    alert("Request submitted successfully!")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "default"
      case "denied":
        return "destructive"
      case "pending":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "destructive"
      case "high":
        return "secondary"
      case "normal":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Employee Requests
        </CardTitle>
        <CardDescription>Submit and track your time off and shift change requests</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submit">Submit Request</TabsTrigger>
            <TabsTrigger value="history">Request History</TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="request-type">Request Type</Label>
                <Select value={requestType} onValueChange={(value: "timeoff" | "reschedule") => setRequestType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timeoff">
                      <div className="flex items-center">
                        <CalendarX className="h-4 w-4 mr-2" />
                        Time Off Request
                      </div>
                    </SelectItem>
                    <SelectItem value="reschedule">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Shift Reschedule
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {requestType === "timeoff" ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="current-shift">Current Shift Date</Label>
                      <Input
                        id="current-shift"
                        type="date"
                        value={formData.currentShiftDate}
                        onChange={(e) => setFormData({ ...formData, currentShiftDate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-shift">Preferred New Date</Label>
                      <Input
                        id="new-shift"
                        type="date"
                        value={formData.newShiftDate}
                        onChange={(e) => setFormData({ ...formData, newShiftDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select
                    value={formData.urgency}
                    onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reason">Reason for Request</Label>
                  <Textarea
                    id="reason"
                    placeholder={
                      requestType === "timeoff"
                        ? "Please explain why you need time off..."
                        : "Please explain why you need to reschedule..."
                    }
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">
                    <Send className="h-4 w-4 mr-2" />
                    Submit Request
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setFormData({
                        startDate: "",
                        endDate: "",
                        currentShiftDate: "",
                        newShiftDate: "",
                        reason: "",
                        urgency: "normal",
                      })
                    }
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      {request.type === "timeoff" ? (
                        <CalendarX className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Calendar className="h-4 w-4 text-green-600" />
                      )}
                      <span className="font-medium">
                        {request.type === "timeoff" ? "Time Off Request" : "Shift Reschedule"}
                      </span>
                    </div>
                    <Badge variant={getStatusColor(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">{request.type === "timeoff" ? "Dates Requested" : "Shift Change"}</p>
                      <p className="font-medium">
                        {request.type === "timeoff"
                          ? `${new Date(request.startDate).toLocaleDateString()} - ${new Date(request.endDate!).toLocaleDateString()}`
                          : `${new Date(request.currentShiftDate!).toLocaleDateString()} → ${new Date(request.newShiftDate!).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Submitted</p>
                      <p className="font-medium">{new Date(request.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-600 text-sm">Reason</p>
                    <p className="text-sm">{request.reason}</p>
                  </div>

                  {request.adminNotes && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-600 text-sm font-medium">Admin Notes</p>
                      <p className="text-sm">{request.adminNotes}</p>
                    </div>
                  )}

                  {request.respondedAt && (
                    <div className="text-xs text-gray-500">
                      Responded on {new Date(request.respondedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
