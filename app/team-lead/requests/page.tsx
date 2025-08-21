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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, DollarSign, Minus, Calendar, User, Filter, Eye, TrendingUp, TrendingDown } from "lucide-react"

type TeamRequest = {
  id: string
  type: 'dock' | 'bonus'
  amount: number
  reason: string
  effective_date: string
  additional_notes?: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  email: string
  emp_id: string
  admin_first_name?: string
  admin_last_name?: string
  admin_email?: string
}

type TeamMember = {
  id: string
  first_name: string
  last_name: string
  email: string
  emp_id: string
}

export default function TeamLeadRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<TeamRequest[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<TeamRequest | null>(null)
  
  // Create request states
  const [requestType, setRequestType] = useState<'dock' | 'bonus'>('bonus')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== "team_lead") {
      router.replace("/team-lead/login")
      return
    }
    ;(async () => {
      try {
        setError(null)
        console.log('🔍 Loading team requests data for user:', user.id)
        
        // Load team members and requests
        const [membersRes, requestsRes] = await Promise.all([
          fetch(`/api/team-lead/team/members`, {
            headers: {
              'Authorization': `Bearer ${user.id}`
            }
          }),
          fetch(`/api/team-lead/requests`, {
            headers: {
              'Authorization': `Bearer ${user.id}`
            }
          })
        ])
        
        if (!membersRes.ok) {
          const errorText = await membersRes.text()
          console.error('❌ Failed to load team members:', membersRes.status, errorText)
          throw new Error(`Failed to load team members: ${membersRes.status}`)
        }
        
        if (!requestsRes.ok) {
          const errorText = await requestsRes.text()
          console.error('❌ Failed to load requests:', requestsRes.status, errorText)
          throw new Error(`Failed to load requests: ${requestsRes.status}`)
        }
        
        const [membersJson, requestsJson] = await Promise.all([
          membersRes.json(),
          requestsRes.json()
        ])
        
        console.log('📊 Data loaded:', {
          members: membersJson.data?.length || 0,
          requests: requestsJson.data?.length || 0
        })
        
        setTeamMembers(membersJson.data || [])
        setRequests(requestsJson.data || [])
        
        console.log('✅ All data set successfully')
      } catch (e: any) {
        console.error('❌ Error in useEffect:', e)
        setError(e.message || "Error loading team requests data")
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  const filteredRequests = useMemo(() => {
    let filtered = requests

    if (typeFilter) {
      filtered = filtered.filter(req => req.type === typeFilter)
    }

    if (statusFilter) {
      filtered = filtered.filter(req => req.status === statusFilter)
    }

    if (employeeFilter) {
      filtered = filtered.filter(req => 
        `${req.first_name} ${req.last_name}`.toLowerCase().includes(employeeFilter.toLowerCase())
      )
    }

    return filtered
  }, [requests, typeFilter, statusFilter, employeeFilter])

  const pendingRequests = useMemo(() => {
    return requests.filter(req => req.status === 'pending')
  }, [requests])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'bonus' ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const handleCreateRequest = async () => {
    if (!selectedEmployee || !amount || !reason || !effectiveDate) {
      toast.error('Please fill in all required fields')
      return
    }

    setCreateLoading(true)
    try {
      const response = await fetch('/api/team-lead/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getCurrentUser()?.id}`
        },
        body: JSON.stringify({
          type: requestType,
          employee_id: selectedEmployee,
          amount: parseFloat(amount),
          reason: reason,
          effective_date: effectiveDate,
          additional_notes: additionalNotes || undefined
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        
        // Add the new request to the list
        setRequests(prev => [result.data, ...prev])
        
        // Reset form
        setRequestType('bonus')
        setSelectedEmployee('')
        setAmount('')
        setReason('')
        setEffectiveDate('')
        setAdditionalNotes('')
        setCreateDialogOpen(false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create request')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setCreateLoading(false)
    }
  }

  const viewRequest = (request: TeamRequest) => {
    setSelectedRequest(request)
    setViewDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div>Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-red-600 text-sm">{error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dock & Bonus Requests</h1>
          <p className="text-muted-foreground">Manage dock and bonus requests for your team members</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Request
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">
              All time requests
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Badge variant="secondary">Awaiting Review</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting admin approval
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</div>
            <p className="text-xs text-muted-foreground">
              Approved requests
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'rejected').length}</div>
            <p className="text-xs text-muted-foreground">
              Rejected requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="type-filter">Request Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="dock">Dock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employee-filter">Employee</Label>
              <Input
                id="employee-filter"
                placeholder="Filter by employee name..."
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(request.type)}
                        <span className="capitalize">{request.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.first_name} {request.last_name}</div>
                        <div className="text-sm text-muted-foreground">{request.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ${(Number(request.amount) || 0).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(request.effective_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewRequest(request)}
                      >
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

      {/* Create Request Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="request-type">Request Type *</Label>
                <Select value={requestType} onValueChange={(value: 'dock' | 'bonus') => setRequestType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="dock">Dock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="employee">Employee *</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="effective-date">Effective Date *</Label>
                <Input
                  id="effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Provide a detailed reason for this request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="additional-notes">Additional Notes</Label>
              <Textarea
                id="additional-notes"
                placeholder="Any additional notes or context..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRequest}
                disabled={createLoading || !selectedEmployee || !amount || !reason || !effectiveDate}
              >
                {createLoading ? 'Creating...' : 'Create Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Request Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Request Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getTypeIcon(selectedRequest.type)}
                    <span className="capitalize font-medium">{selectedRequest.type}</span>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedRequest.status)}>
                      {selectedRequest.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedRequest.first_name} {selectedRequest.last_name}</div>
                    <div className="text-sm text-muted-foreground">{selectedRequest.email}</div>
                  </div>
                </div>
                <div>
                  <Label>Amount</Label>
                  <div className="font-medium text-lg mt-1">
                    ${(Number(selectedRequest.amount) || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Effective Date</Label>
                <div className="mt-1">
                  {new Date(selectedRequest.effective_date).toLocaleDateString()}
                </div>
              </div>
              
              <div>
                <Label>Reason</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  {selectedRequest.reason}
                </div>
              </div>
              
              {selectedRequest.additional_notes && (
                <div>
                  <Label>Additional Notes</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {selectedRequest.additional_notes}
                  </div>
                </div>
              )}
              
              {selectedRequest.admin_notes && (
                <div>
                  <Label>Admin Notes</Label>
                  <div className="mt-1 p-3 bg-blue-50 rounded-md">
                    {selectedRequest.admin_notes}
                  </div>
                </div>
              )}
              
              {selectedRequest.admin_first_name && (
                <div>
                  <Label>Reviewed By</Label>
                  <div className="mt-1">
                    {selectedRequest.admin_first_name} {selectedRequest.admin_last_name}
                    {selectedRequest.reviewed_at && (
                      <div className="text-sm text-muted-foreground">
                        on {new Date(selectedRequest.reviewed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
