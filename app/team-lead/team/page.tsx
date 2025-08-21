"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { User, Clock, Calendar, FileText, MessageSquare, Star, TrendingUp, Send, Plus, Eye, Filter, DollarSign } from "lucide-react"
import { useTeamLeadRealtime } from "@/lib/hooks/use-team-lead-realtime"
import { RealtimeStatus } from "@/components/ui/realtime-status"

type Member = {
  id: string
  first_name: string
  last_name: string
  email: string
  status?: string
}

type SwapRequest = {
  id: string
  requester_first_name: string
  requester_last_name: string
  target_first_name: string
  target_last_name: string
  status: 'pending' | 'approved' | 'denied'
  created_at: string
}

type LeaveRequest = {
  id: string
  first_name: string
  last_name: string
  type: string
  start_date: string
  end_date: string
  status: 'pending' | 'approved' | 'denied'
  created_at: string
}

type MeetingNote = {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  clock_in_time: string
  clock_out_time: string
  total_calls_taken: number
  leads_generated: number
  shift_remarks: string
  performance_rating: number
  created_at: string
}

export default function TeamLeadTeamOverviewPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState("members")

  // Real-time updates
  const realtimeData = useTeamLeadRealtime(teamId)

  // Dialog states
  const [swapDialogOpen, setSwapDialogOpen] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [consolidateDialogOpen, setConsolidateDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<SwapRequest | LeaveRequest | null>(null)
  const [notes, setNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Consolidate report states
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [summary, setSummary] = useState("")
  const [highlights, setHighlights] = useState<string[]>([])
  const [concerns, setConcerns] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [sendToPm, setSendToPm] = useState(true)
  const [consolidateLoading, setConsolidateLoading] = useState(false)

  // Filter states
  const [employeeFilter, setEmployeeFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [hasRemarksFilter, setHasRemarksFilter] = useState("all")

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
        
        const [membersRes, swapRes, leaveRes, meetingNotesRes] = await Promise.all([
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
          }),
          fetch(`/api/team-lead/meeting-notes`, {
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
        
        if (!meetingNotesRes.ok) {
          const errorText = await meetingNotesRes.text()
          console.error('❌ Failed to load meeting notes:', meetingNotesRes.status, errorText)
          throw new Error(`Failed to load meeting notes: ${meetingNotesRes.status}`)
        }
        
        console.log('✅ All API calls successful, parsing responses...')
        
        const [membersJson, swapJson, leaveJson, meetingNotesJson] = await Promise.all([
          membersRes.json(),
          swapRes.json(),
          leaveRes.json(),
          meetingNotesRes.json()
        ])
        
        console.log('📊 Data loaded:', {
          members: membersJson.data?.length || 0,
          swapRequests: swapJson.data?.length || 0,
          leaveRequests: leaveJson.data?.length || 0,
          meetingNotes: meetingNotesJson.data?.length || 0
        })
        
        setMembers(membersJson.data || [])
        setSwapRequests(swapJson.data || [])
        setLeaveRequests(leaveJson.data || [])
        setMeetingNotes(meetingNotesJson.data || [])
        
        console.log('✅ All data set successfully')
      } catch (e: any) {
        console.error('❌ Error in useEffect:', e)
        setError(e.message || "Error loading team data")
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  // Update data from real-time updates
  useEffect(() => {
    if (realtimeData.teamMembers.length > 0) {
      setMembers(realtimeData.teamMembers)
    }
    if (realtimeData.meetingNotes.length > 0) {
      setMeetingNotes(realtimeData.meetingNotes)
    }
  }, [realtimeData.teamMembers, realtimeData.meetingNotes])

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

  const filteredMeetingNotes = useMemo(() => {
    let filtered = meetingNotes

    if (employeeFilter) {
      filtered = filtered.filter(note => 
        `${note.first_name} ${note.last_name}`.toLowerCase().includes(employeeFilter.toLowerCase())
      )
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter(note => {
        const noteDate = new Date(note.clock_in_time)
        return noteDate.toDateString() === filterDate.toDateString()
      })
    }

    if (hasRemarksFilter === 'true') {
      filtered = filtered.filter(note => note.shift_remarks && note.shift_remarks.trim() !== '')
    } else if (hasRemarksFilter === 'false') {
      filtered = filtered.filter(note => !note.shift_remarks || note.shift_remarks.trim() === '')
    }
    // If hasRemarksFilter is 'all' or empty, don't filter

    return filtered
  }, [meetingNotes, employeeFilter, dateFilter, hasRemarksFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'denied':
      case 'denied': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSwapAction = async (action: 'approve' | 'deny') => {
    if (!selectedRequest) return
    
    setActionLoading(true)
    try {
      const response = await fetch(`/api/team-lead/shifts/swap-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getCurrentUser()?.id}`
        },
        body: JSON.stringify({
          status: action === 'approve' ? 'approved' : 'denied',
          team_lead_notes: notes
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        
        // Update local state
        setSwapRequests(prev => prev.map(req => 
          req.id === selectedRequest.id 
            ? { ...req, status: action === 'approve' ? 'approved' : 'denied' }
            : req
        ))
        
        setSwapDialogOpen(false)
        setSelectedRequest(null)
        setNotes("")
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update request')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeaveAction = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return
    
    setActionLoading(true)
    try {
      const response = await fetch(`/api/team-lead/leave-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getCurrentUser()?.id}`
        },
        body: JSON.stringify({
          status: action === 'approve' ? 'approved' : 'denied',
          team_lead_notes: notes
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        
        // Update local state
        setLeaveRequests(prev => prev.map(req => 
          req.id === selectedRequest.id 
            ? { ...req, status: action === 'approve' ? 'approved' : 'denied' }
            : req
        ))
        
        setLeaveDialogOpen(false)
        setSelectedRequest(null)
        setNotes("")
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update request')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConsolidateReport = async () => {
    if (!summary.trim()) {
      toast.error('Please provide a summary')
      return
    }

    setConsolidateLoading(true)
    try {
      const response = await fetch('/api/team-lead/meeting-notes/consolidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getCurrentUser()?.id}`
        },
        body: JSON.stringify({
          date_from: dateFrom,
          date_to: dateTo,
          summary: summary,
          highlights: highlights.filter(h => h.trim()),
          concerns: concerns.filter(c => c.trim()),
          recommendations: recommendations.filter(r => r.trim()),
          send_to_pm: sendToPm
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Report consolidated and sent successfully!')
        setConsolidateDialogOpen(false)
        
        // Reset form
        setDateFrom("")
        setDateTo("")
        setSummary("")
        setHighlights([])
        setConcerns([])
        setRecommendations([])
        setSendToPm(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to consolidate report')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setConsolidateLoading(false)
    }
  }

  const addHighlight = () => {
    setHighlights([...highlights, ""])
  }

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...highlights]
    newHighlights[index] = value
    setHighlights(newHighlights)
  }

  const removeHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index))
  }

  const addConcern = () => {
    setConcerns([...concerns, ""])
  }

  const updateConcern = (index: number, value: string) => {
    const newConcerns = [...concerns]
    newConcerns[index] = value
    setConcerns(newConcerns)
  }

  const removeConcern = (index: number) => {
    setConcerns(concerns.filter((_, i) => i !== index))
  }

  const addRecommendation = () => {
    setRecommendations([...recommendations, ""])
  }

  const updateRecommendation = (index: number, value: string) => {
    const newRecommendations = [...recommendations]
    newRecommendations[index] = value
    setRecommendations(newRecommendations)
  }

  const removeRecommendation = (index: number) => {
    setRecommendations(recommendations.filter((_, i) => i !== index))
  }

  const exportCsv = () => {
    const csvContent = [
      ['Name', 'Email', 'Status'],
      ...filteredMembers.map(m => [m.first_name + ' ' + m.last_name, m.email, m.status || 'Active'])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
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
          <p className="text-muted-foreground">Manage your team members, swap requests, leave requests, and meeting notes</p>
        </div>
        <div className="flex items-center gap-4">
          <RealtimeStatus
            isConnected={realtimeData.isConnected}
            isConnecting={realtimeData.isConnecting}
            error={realtimeData.error}
            lastUpdate={realtimeData.lastUpdate}
            onReconnect={realtimeData.reconnect}
            showDetails={true}
          />
          <Button variant="outline" onClick={() => router.push('/team-lead/requests')}>
            <DollarSign className="h-4 w-4 mr-2" />
            Dock & Bonus Requests
          </Button>
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
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="meeting-notes" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Meeting Notes ({filteredMeetingNotes.length})
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
                  <div className="text-center py-8 text-muted-foreground">
                    No pending swap requests
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingSwapRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">
                            {request.requester_first_name} {request.requester_last_name} → {request.target_first_name} {request.target_last_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Requested on {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedRequest(request)
                            setSwapDialogOpen(true)
                          }}
                        >
                          Review
                        </Button>
                      </div>
                    ))}
                  </div>
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
                  <div className="text-center py-8 text-muted-foreground">
                    No pending leave requests
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingLeaveRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">
                            {request.first_name} {request.last_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {request.type} • {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedRequest(request)
                            setLeaveDialogOpen(true)
                          }}
                        >
                          Review
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meeting-notes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Meeting Notes Review</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setConsolidateDialogOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Consolidate Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <Label htmlFor="employee-filter">Employee</Label>
                    <Input
                      id="employee-filter"
                      placeholder="Filter by employee name..."
                      value={employeeFilter}
                      onChange={(e) => setEmployeeFilter(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="date-filter">Date</Label>
                    <Input
                      id="date-filter"
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="remarks-filter">Has Remarks</Label>
                    <Select value={hasRemarksFilter} onValueChange={setHasRemarksFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All notes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All notes</SelectItem>
                        <SelectItem value="true">With remarks</SelectItem>
                        <SelectItem value="false">Without remarks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Meeting Notes Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMeetingNotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No meeting notes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMeetingNotes.map((note) => (
                        <TableRow key={note.id}>
                          <TableCell>
                            {note.first_name} {note.last_name}
                          </TableCell>
                          <TableCell>
                            {new Date(note.clock_in_time).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              {note.performance_rating}/5
                            </div>
                          </TableCell>
                          <TableCell>{note.total_calls_taken || 0}</TableCell>
                          <TableCell>{note.leads_generated || 0}</TableCell>
                          <TableCell>
                            {note.shift_remarks ? (
                              <div className="max-w-xs truncate" title={note.shift_remarks}>
                                {note.shift_remarks.substring(0, 50)}...
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No remarks</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Requests Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Swap Requests</h3>
                    <div className="space-y-2">
                      {swapRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium text-sm">
                              {request.requester_first_name} → {request.target_first_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Leave Requests</h3>
                    <div className="space-y-2">
                      {leaveRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium text-sm">
                              {request.first_name} {request.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {request.type} • {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Swap Request Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Swap Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">
                  {selectedRequest.requester_first_name} {selectedRequest.requester_last_name} → {selectedRequest.target_first_name} {selectedRequest.target_last_name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Requested on {new Date(selectedRequest.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <Label htmlFor="swap-notes">Notes (optional)</Label>
                <Textarea
                  id="swap-notes"
                  placeholder="Add notes about your decision..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSwapDialogOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleSwapAction('deny')}
                  disabled={actionLoading}
                >
                  Deny
                </Button>
                <Button
                  onClick={() => handleSwapAction('approve')}
                  disabled={actionLoading}
                >
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Leave Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">
                  {selectedRequest.first_name} {selectedRequest.last_name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.type} • {new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <Label htmlFor="leave-notes">Notes (optional)</Label>
                <Textarea
                  id="leave-notes"
                  placeholder="Add notes about your decision..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setLeaveDialogOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleLeaveAction('reject')}
                  disabled={actionLoading}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleLeaveAction('approve')}
                  disabled={actionLoading}
                >
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Consolidate Report Dialog */}
      <Dialog open={consolidateDialogOpen} onOpenChange={setConsolidateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consolidate Team Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date-from">Date From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="date-to">Date To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Summary */}
            <div>
              <Label htmlFor="summary">Summary *</Label>
              <Textarea
                id="summary"
                placeholder="Provide a comprehensive summary of the team's performance and activities during this period..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
              />
            </div>

            {/* Highlights */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Key Highlights</Label>
                <Button variant="outline" size="sm" onClick={addHighlight}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {highlights.map((highlight, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Enter a key highlight..."
                      value={highlight}
                      onChange={(e) => updateHighlight(index, e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeHighlight(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Concerns */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Concerns</Label>
                <Button variant="outline" size="sm" onClick={addConcern}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {concerns.map((concern, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Enter a concern..."
                      value={concern}
                      onChange={(e) => updateConcern(index, e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeConcern(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Recommendations</Label>
                <Button variant="outline" size="sm" onClick={addRecommendation}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {recommendations.map((recommendation, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Enter a recommendation..."
                      value={recommendation}
                      onChange={(e) => updateRecommendation(index, e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeRecommendation(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Send to PM */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="send-to-pm"
                checked={sendToPm}
                onChange={(e) => setSendToPm(e.target.checked)}
              />
              <Label htmlFor="send-to-pm">Send report to Project Manager</Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setConsolidateDialogOpen(false)}
                disabled={consolidateLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConsolidateReport}
                disabled={consolidateLoading || !summary.trim()}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {consolidateLoading ? 'Consolidating...' : 'Consolidate & Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
