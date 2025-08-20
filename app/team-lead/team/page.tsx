"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Calendar, Clock, User, FileText, CheckCircle, XCircle } from "lucide-react"

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  status?: string
}

interface SwapRequest {
  id: string
  requester_first_name: string
  requester_last_name: string
  requester_email: string
  target_first_name: string
  target_last_name: string
  target_email: string
  original_shift_date: string
  original_start_time: string
  original_end_time: string
  requested_shift_date: string
  requested_start_time: string
  requested_end_time: string
  reason?: string
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  created_at: string
  approved_by_first_name?: string
  approved_by_last_name?: string
  admin_notes?: string
}

interface LeaveRequest {
  id: string
  first_name: string
  last_name: string
  email: string
  emp_id: string
  department: string
  type: string
  start_date: string
  end_date: string
  days_requested: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  approved_by_first_name?: string
  approved_by_last_name?: string
  admin_notes?: string
}

export default function TeamLeadTeamOverviewPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState("members")
  
  // Dialog states
  const [swapDialogOpen, setSwapDialogOpen] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<SwapRequest | LeaveRequest | null>(null)
  const [notes, setNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== "team_lead") {
      router.replace("/team-lead/login")
      return
    }
    ;(async () => {
      try {
        setError(null)
        console.log('🔍 Loading team data for user:', user.id)
        
        // First, get the team information
        const teamRes = await fetch(`/api/teams/by-lead?leadId=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${user.id}`
          }
        })
        
        if (teamRes.ok) {
          const teamJson = await teamRes.json()
          const team = teamJson.data?.[0]
          if (team) {
            setTeamId(team.id)
            console.log('✅ Team found:', team.id, team.name)
          } else {
            console.log('⚠️ No team found for user')
            setTeamId(null)
          }
        } else {
          console.log('⚠️ Could not fetch team info, will try to get from members')
          setTeamId(null)
        }
        
        // Use the Team Lead-specific API endpoints that have proper authentication
        console.log('🔄 Loading team data using Team Lead APIs...')
        
        const [membersRes, swapRes, leaveRes] = await Promise.all([
          fetch(`/api/team-lead/team/members`, {
            headers: {
              'Authorization': `Bearer ${user.id}`
            }
          }),
          fetch(`/api/team-lead/shifts/swap-requests`, {
            headers: {
              'Authorization': `Bearer ${user.id}`
            }
          }),
          fetch(`/api/team-lead/leave-requests`, {
            headers: {
              'Authorization': `Bearer ${user.id}`
            }
          })
        ])
        
        // Check each response individually
        if (!membersRes.ok) {
          const errorText = await membersRes.text()
          console.error('❌ Failed to load members:', membersRes.status, errorText)
          throw new Error(`Failed to load members: ${membersRes.status}`)
        }
        
        if (!swapRes.ok) {
          const errorText = await swapRes.text()
          console.error('❌ Failed to load swap requests:', swapRes.status, errorText)
          throw new Error(`Failed to load swap requests: ${swapRes.status}`)
        }
        
        if (!leaveRes.ok) {
          const errorText = await leaveRes.text()
          console.error('❌ Failed to load leave requests:', leaveRes.status, errorText)
          throw new Error(`Failed to load leave requests: ${leaveRes.status}`)
        }
        
        console.log('✅ All API calls successful, parsing responses...')
        
        const [membersJson, swapJson, leaveJson] = await Promise.all([
          membersRes.json(),
          swapRes.json(),
          leaveRes.json()
        ])
        
        console.log('📊 Data loaded:', {
          members: membersJson.data?.length || 0,
          swapRequests: swapJson.data?.length || 0,
          leaveRequests: leaveJson.data?.length || 0
        })
        
        setMembers(membersJson.data || [])
        setSwapRequests(swapJson.data || [])
        setLeaveRequests(leaveJson.data || [])
        
        console.log('✅ All data set successfully')
      } catch (e: any) {
        console.error('❌ Error in useEffect:', e)
        setError(e.message || "Error loading team data")
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q)
    )
  }, [members, query])

  const pendingSwapRequests = useMemo(() => {
    return swapRequests.filter(req => req.status === 'pending')
  }, [swapRequests])

  const pendingLeaveRequests = useMemo(() => {
    return leaveRequests.filter(req => req.status === 'pending')
  }, [leaveRequests])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'denied':
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSwapAction = async (requestId: string, action: 'approved' | 'denied') => {
    setActionLoading(true)
    try {
      const user = AuthService.getCurrentUser()
      const response = await fetch(`/api/team-lead/shifts/swap-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify({
          status: action,
          team_lead_notes: notes
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        
        // Update local state
        setSwapRequests(prev => prev.map(req => 
          req.id === requestId ? { ...req, status: action, admin_notes: notes } : req
        ))
        
        setSwapDialogOpen(false)
        setSelectedRequest(null)
        setNotes("")
      } else {
        const error = await response.json()
        toast.error(error.error || `Failed to ${action} swap request`)
      }
    } catch (error) {
      console.error(`Error ${action}ing swap request:`, error)
      toast.error(`Failed to ${action} swap request`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeaveAction = async (requestId: string, action: 'approved' | 'rejected') => {
    setActionLoading(true)
    try {
      const user = AuthService.getCurrentUser()
      const response = await fetch(`/api/team-lead/leave-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify({
          status: action,
          team_lead_notes: notes
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        
        // Update local state
        setLeaveRequests(prev => prev.map(req => 
          req.id === requestId ? { ...req, status: action, admin_notes: notes } : req
        ))
        
        setLeaveDialogOpen(false)
        setSelectedRequest(null)
        setNotes("")
      } else {
        const error = await response.json()
        toast.error(error.error || `Failed to ${action} leave request`)
      }
    } catch (error) {
      console.error(`Error ${action}ing leave request:`, error)
      toast.error(`Failed to ${action} leave request`)
    } finally {
      setActionLoading(false)
    }
  }

  const openSwapDialog = (request: SwapRequest) => {
    setSelectedRequest(request)
    setNotes(request.admin_notes || "")
    setSwapDialogOpen(true)
  }

  const openLeaveDialog = (request: LeaveRequest) => {
    setSelectedRequest(request)
    setNotes(request.admin_notes || "")
    setLeaveDialogOpen(true)
  }

  function exportCsv() {
    const header = ["First Name", "Last Name", "Email"]
    const rows = filteredMembers.map((m) => [m.first_name, m.last_name, m.email])
    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((field) => {
            const v = String(field ?? "")
            return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
          })
          .join(",")
      )
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "team_members.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage your team members, swap requests, and leave requests</p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div>Loading...</div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-red-600 text-sm">{error}</div>
          </CardContent>
        </Card>
      ) : teamId === null ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-gray-500">No team assigned.</div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="swap-requests" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Swap Requests ({pendingSwapRequests.length})
            </TabsTrigger>
            <TabsTrigger value="leave-requests" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Leave Requests ({pendingLeaveRequests.length})
            </TabsTrigger>
            <TabsTrigger value="all-requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              All Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Team Members</CardTitle>
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Search name or email..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-56"
                    />
                    <Button variant="outline" onClick={exportCsv}>
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          No members found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            {m.first_name} {m.last_name}
                          </TableCell>
                          <TableCell>{m.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{m.status || 'Active'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="swap-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Swap Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingSwapRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No pending swap requests
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requester</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Original Shift</TableHead>
                        <TableHead>Requested Shift</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingSwapRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{req.requester_first_name} {req.requester_last_name}</div>
                              <div className="text-sm text-gray-500">{req.requester_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{req.target_first_name} {req.target_last_name}</div>
                              <div className="text-sm text-gray-500">{req.target_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{new Date(req.original_shift_date).toLocaleDateString()}</div>
                              <div>{req.original_start_time} - {req.original_end_time}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{new Date(req.requested_shift_date).toLocaleDateString()}</div>
                              <div>{req.requested_start_time} - {req.requested_end_time}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600 max-w-xs truncate">
                              {req.reason || 'No reason provided'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openSwapDialog(req)}
                              >
                                Review
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Leave Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingLeaveRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No pending leave requests
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingLeaveRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{req.first_name} {req.last_name}</div>
                              <div className="text-sm text-gray-500">{req.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {req.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{new Date(req.start_date).toLocaleDateString()}</div>
                              <div>to {new Date(req.end_date).toLocaleDateString()}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{req.days_requested} days</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600 max-w-xs truncate">
                              {req.reason || 'No reason provided'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openLeaveDialog(req)}
                              >
                                Review
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all-requests" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Swap Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {swapRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No swap requests
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {swapRequests.map((req) => (
                        <div key={req.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium">
                              {req.requester_first_name} {req.requester_last_name} ↔ {req.target_first_name} {req.target_last_name}
                            </div>
                            <Badge className={getStatusColor(req.status)}>
                              {req.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(req.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>All Leave Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {leaveRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No leave requests
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leaveRequests.map((req) => (
                        <div key={req.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium">
                              {req.first_name} {req.last_name}
                            </div>
                            <Badge className={getStatusColor(req.status)}>
                              {req.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            {req.type} • {req.days_requested} days • {new Date(req.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Swap Request Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Swap Request</DialogTitle>
            <DialogDescription>
              Review and approve or deny this shift swap request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && 'requester_first_name' in selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Requester</Label>
                  <div className="text-sm">
                    {selectedRequest.requester_first_name} {selectedRequest.requester_last_name}
                    <br />
                    <span className="text-gray-500">{selectedRequest.requester_email}</span>
                  </div>
                </div>
                <div>
                  <Label>Target</Label>
                  <div className="text-sm">
                    {selectedRequest.target_first_name} {selectedRequest.target_last_name}
                    <br />
                    <span className="text-gray-500">{selectedRequest.target_email}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Original Shift</Label>
                  <div className="text-sm">
                    {new Date(selectedRequest.original_shift_date).toLocaleDateString()}
                    <br />
                    {selectedRequest.original_start_time} - {selectedRequest.original_end_time}
                  </div>
                </div>
                <div>
                  <Label>Requested Shift</Label>
                  <div className="text-sm">
                    {new Date(selectedRequest.requested_shift_date).toLocaleDateString()}
                    <br />
                    {selectedRequest.requested_start_time} - {selectedRequest.requested_end_time}
                  </div>
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <div className="text-sm text-gray-600">
                  {selectedRequest.reason || 'No reason provided'}
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about your decision..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSwapDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleSwapAction(selectedRequest.id, 'denied')}
              disabled={actionLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Deny
            </Button>
            <Button
              onClick={() => selectedRequest && handleSwapAction(selectedRequest.id, 'approved')}
              disabled={actionLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Leave Request</DialogTitle>
            <DialogDescription>
              Review and approve or reject this leave request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && 'first_name' in selectedRequest && !('requester_first_name' in selectedRequest) && (
            <div className="space-y-4">
              <div>
                <Label>Employee</Label>
                <div className="text-sm">
                  {selectedRequest.first_name} {selectedRequest.last_name}
                  <br />
                  <span className="text-gray-500">{selectedRequest.email}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Leave Type</Label>
                  <Badge variant="outline" className="capitalize">
                    {selectedRequest.type}
                  </Badge>
                </div>
                <div>
                  <Label>Duration</Label>
                  <div className="text-sm">
                    {selectedRequest.days_requested} days
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <div className="text-sm">
                    {new Date(selectedRequest.start_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Label>End Date</Label>
                  <div className="text-sm">
                    {new Date(selectedRequest.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <div className="text-sm text-gray-600">
                  {selectedRequest.reason || 'No reason provided'}
                </div>
              </div>
              <div>
                <Label htmlFor="leave-notes">Notes (Optional)</Label>
                <Textarea
                  id="leave-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about your decision..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLeaveDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleLeaveAction(selectedRequest.id, 'rejected')}
              disabled={actionLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => selectedRequest && handleLeaveAction(selectedRequest.id, 'approved')}
              disabled={actionLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
