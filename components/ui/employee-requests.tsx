"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Calendar, CalendarX, Clock, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Request {
  id: string
  type: "timeoff" | "reschedule" | "vacation" | "sick" | "personal" | "bereavement" | "jury-duty" | "other"
  startDate: string
  endDate?: string
  currentShiftDate?: string
  newShiftDate?: string
  reason: string
  status: "pending" | "approved" | "denied"
  submittedAt: string
  respondedAt?: string
  adminNotes?: string
  days_requested?: number
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
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setIsLoadingData(true)
      const response = await fetch(`/api/leave-requests?employee_id=${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        const formattedRequests = (data.data || []).map((request: any) => ({
          id: request.id,
          type: request.type,
          startDate: request.start_date,
          endDate: request.end_date,
          reason: request.reason,
          status: request.status,
          submittedAt: request.created_at,
          respondedAt: request.updated_at,
          adminNotes: request.admin_notes,
          days_requested: request.days_requested
        }))
        setRequests(formattedRequests)
      }
    } catch (error) {
      console.error('Error loading requests:', error)
      toast({
        title: "Error",
        description: "Failed to load requests",
        variant: "destructive",
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const startDate = formData.startDate
    const endDate = formData.endDate
    if (!startDate || !endDate || !formData.reason) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    if (startDate > endDate) {
      toast({
        title: "Error",
        description: "Start date cannot be after end date",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Calculate days requested
      const start = new Date(startDate)
      const end = new Date(endDate)
      const daysRequested = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'vacation', // Default to vacation for time off requests
          start_date: startDate,
          end_date: endDate,
          days_requested: daysRequested,
          reason: formData.reason,
        }),
      })

      if (response.ok) {
        const newRequest = await response.json()
        setRequests(prev => [newRequest, ...prev])
        
        // Reset form
        setFormData({
          startDate: "",
          endDate: "",
          currentShiftDate: "",
          newShiftDate: "",
          reason: "",
          urgency: "normal",
        })
        
        toast({
          title: "Success",
          description: "Request submitted successfully!",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to submit request",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error submitting request:', error)
      toast({
        title: "Error",
        description: "Failed to submit request",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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
                      <Label htmlFor="current-shift-date">Current Shift Date</Label>
                      <Input
                        id="current-shift-date"
                        type="date"
                        value={formData.currentShiftDate}
                        onChange={(e) => setFormData({ ...formData, currentShiftDate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-shift-date">New Shift Date</Label>
                      <Input
                        id="new-shift-date"
                        type="date"
                        value={formData.newShiftDate}
                        onChange={(e) => setFormData({ ...formData, newShiftDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Please provide a reason for your request..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select value={formData.urgency} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {isLoadingData ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading requests...</p>
              </div>
            ) : requests.length > 0 ? (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold capitalize">{request.type} Request</h4>
                        <p className="text-sm text-gray-600">
                          {request.startDate} {request.endDate && `- ${request.endDate}`}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                        <Badge variant={getUrgencyColor(formData.urgency)}>{formData.urgency}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{request.reason}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Submitted: {new Date(request.submittedAt).toLocaleDateString()}</span>
                      {request.respondedAt && (
                        <span>Responded: {new Date(request.respondedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    {request.adminNotes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <strong>Admin Notes:</strong> {request.adminNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No requests found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
