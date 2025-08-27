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
import { FileText, Eye, CheckCircle, XCircle, Clock, Filter, TrendingUp, Users, Calendar } from "lucide-react"
import { usePMRealtime } from "@/lib/hooks/use-pm-realtime"
import { RealtimeStatus } from "@/components/ui/realtime-status"

type TeamReport = {
  id: string
  team_id: string
  team_name: string
  date_from: string
  date_to: string
  summary: string
  highlights: string[]
  concerns: string[]
  recommendations: string[]
  statistics: any
  status: 'pending' | 'reviewed' | 'approved' | 'rejected'
  pm_notes?: string
  pm_reviewed_at?: string
  created_at: string
  updated_at: string
  team_lead_first_name: string
  team_lead_last_name: string
  team_lead_email: string
  pm_first_name?: string
  pm_last_name?: string
  pm_email?: string
}

type ManagedTeam = {
  id: string
  name: string
  department: string
}

type SummaryStats = {
  total_reports: number
  pending_reports: number
  reviewed_reports: number
  approved_reports: number
  rejected_reports: number
}

export default function PMReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<TeamReport[]>([])
  const [managedTeams, setManagedTeams] = useState<ManagedTeam[]>([])
  const [summary, setSummary] = useState<SummaryStats>({
    total_reports: 0,
    pending_reports: 0,
    reviewed_reports: 0,
    approved_reports: 0,
    rejected_reports: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Real-time updates
  const realtimeData = usePMRealtime()
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<TeamReport | null>(null)
  
  // Review states
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'reviewed' | 'approved' | 'rejected'>('reviewed')
  const [pmNotes, setPmNotes] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  
  // Filter states
  const [teamFilter, setTeamFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== "project_manager") {
      router.replace("/login")
      return
    }
    loadReports()
  }, [router])

  // Update data from real-time updates
  useEffect(() => {
    if (realtimeData.teamReports.length > 0) {
      setReports(realtimeData.teamReports)
    }
    if (realtimeData.managedTeams.length > 0) {
      setManagedTeams(realtimeData.managedTeams)
    }
    if (realtimeData.summary) {
      setSummary(realtimeData.summary)
    }
  }, [realtimeData.teamReports, realtimeData.managedTeams, realtimeData.summary])

  const loadReports = async () => {
    try {
      setError(null)
      setLoading(true)
      
      const user = AuthService.getCurrentUser()
      if (!user) return
      
      // Build query parameters
      const params = new URLSearchParams()
      if (teamFilter) params.append('team_id', teamFilter)
      if (statusFilter) params.append('status', statusFilter)
      if (dateFromFilter) params.append('date_from', dateFromFilter)
      if (dateToFilter) params.append('date_to', dateToFilter)
      
      const response = await fetch(`/api/project-manager/team-reports?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to load reports: ${response.status}`)
      }
      
      const data = await response.json()
      setReports(data.data || [])
      setManagedTeams(data.managed_teams || [])
      setSummary(data.summary || {
        total_reports: 0,
        pending_reports: 0,
        reviewed_reports: 0,
        approved_reports: 0,
        rejected_reports: 0
      })
    } catch (e: any) {
      console.error('Error loading reports:', e)
      setError(e.message || "Error loading team reports")
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = useMemo(() => {
    let filtered = reports

    if (teamFilter) {
      filtered = filtered.filter(report => report.team_id === teamFilter)
    }

    if (statusFilter) {
      filtered = filtered.filter(report => report.status === statusFilter)
    }

    if (dateFromFilter) {
      filtered = filtered.filter(report => report.date_from >= dateFromFilter)
    }

    if (dateToFilter) {
      filtered = filtered.filter(report => report.date_to <= dateToFilter)
    }

    return filtered
  }, [reports, teamFilter, statusFilter, dateFromFilter, dateToFilter])

  const viewReport = (report: TeamReport) => {
    setSelectedReport(report)
    setViewDialogOpen(true)
  }

  const reviewReport = (report: TeamReport) => {
    setSelectedReport(report)
    setReviewStatus(report.status)
    setPmNotes(report.pm_notes || '')
    setReviewDialogOpen(true)
  }

  const handleReviewSubmit = async () => {
    if (!selectedReport) return

    setReviewLoading(true)
    try {
      const user = AuthService.getCurrentUser()
      if (!user) return

      const response = await fetch(`/api/project-manager/team-reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          status: reviewStatus,
          pm_notes: pmNotes || undefined
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        
        // Update the report in the list
        setReports(prev => prev.map(report => 
          report.id === selectedReport.id 
            ? { ...report, status: reviewStatus, pm_notes: pmNotes, pm_reviewed_at: new Date().toISOString() }
            : report
        ))
        
        setReviewDialogOpen(false)
        setSelectedReport(null)
        setReviewStatus('reviewed')
        setPmNotes('')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update report')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setReviewLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'reviewed': return <Eye className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div>Loading team reports...</div>
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
          <h1 className="text-2xl font-bold">Team Reports</h1>
          <p className="text-muted-foreground">Review and manage team reports from your managed teams</p>
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
          <Button onClick={loadReports} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_reports}</div>
            <p className="text-xs text-muted-foreground">
              All time reports
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Badge variant="secondary">Awaiting Review</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pending_reports}</div>
            <p className="text-xs text-muted-foreground">
              Need your review
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.reviewed_reports}</div>
            <p className="text-xs text-muted-foreground">
              Reviewed reports
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.approved_reports}</div>
            <p className="text-xs text-muted-foreground">
              Approved reports
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.rejected_reports}</div>
            <p className="text-xs text-muted-foreground">
              Rejected reports
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="team-filter">Team</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All teams</SelectItem>
                  {managedTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date-from">Date From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date-to">Date To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No reports found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.team_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.team_lead_first_name} {report.team_lead_last_name}</div>
                        <div className="text-sm text-muted-foreground">{report.team_lead_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(report.date_from).toLocaleDateString()} - {new Date(report.date_to).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(report.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(report.status)}
                          {report.status}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(report.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewReport(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reviewReport(report)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Report Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Team Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Team</Label>
                  <div className="mt-1 font-medium">{selectedReport.team_name}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedReport.status)}>
                      {selectedReport.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Team Lead</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedReport.team_lead_first_name} {selectedReport.team_lead_last_name}</div>
                    <div className="text-sm text-muted-foreground">{selectedReport.team_lead_email}</div>
                  </div>
                </div>
                <div>
                  <Label>Date Range</Label>
                  <div className="mt-1">
                    {new Date(selectedReport.date_from).toLocaleDateString()} - {new Date(selectedReport.date_to).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Summary</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  {selectedReport.summary}
                </div>
              </div>
              
              {selectedReport.highlights && selectedReport.highlights.length > 0 && (
                <div>
                  <Label>Highlights</Label>
                  <div className="mt-1 space-y-2">
                    {selectedReport.highlights.map((highlight, index) => (
                      <div key={index} className="p-2 bg-green-50 rounded-md">
                        • {highlight}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedReport.concerns && selectedReport.concerns.length > 0 && (
                <div>
                  <Label>Concerns</Label>
                  <div className="mt-1 space-y-2">
                    {selectedReport.concerns.map((concern, index) => (
                      <div key={index} className="p-2 bg-yellow-50 rounded-md">
                        • {concern}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedReport.recommendations && selectedReport.recommendations.length > 0 && (
                <div>
                  <Label>Recommendations</Label>
                  <div className="mt-1 space-y-2">
                    {selectedReport.recommendations.map((recommendation, index) => (
                      <div key={index} className="p-2 bg-blue-50 rounded-md">
                        • {recommendation}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedReport.statistics && (
                <div>
                  <Label>Statistics</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <pre className="text-sm">{JSON.stringify(selectedReport.statistics, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              {selectedReport.pm_notes && (
                <div>
                  <Label>PM Notes</Label>
                  <div className="mt-1 p-3 bg-blue-50 rounded-md">
                    {selectedReport.pm_notes}
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
                <Button
                  onClick={() => {
                    setViewDialogOpen(false)
                    reviewReport(selectedReport)
                  }}
                >
                  Review Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Report Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Team Report</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <Label>Team</Label>
                <div className="mt-1 font-medium">{selectedReport.team_name}</div>
              </div>
              
              <div>
                <Label>Status *</Label>
                <Select value={reviewStatus} onValueChange={(value: 'pending' | 'reviewed' | 'approved' | 'rejected') => setReviewStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>PM Notes</Label>
                <Textarea
                  placeholder="Add your review notes..."
                  value={pmNotes}
                  onChange={(e) => setPmNotes(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setReviewDialogOpen(false)}
                  disabled={reviewLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReviewSubmit}
                  disabled={reviewLoading}
                >
                  {reviewLoading ? 'Updating...' : 'Update Report'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
