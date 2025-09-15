"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Clock, 
  Calendar, 
  User, 
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Download,
  Filter,
  Search,
  BarChart3,
  TrendingUp,
  Coffee,
  Play,
  Pause,
  Square,
  Timer,
  CalendarDays,
  FileText,
  PieChart,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Clock3,
  Timer as TimerIcon
} from 'lucide-react'
import { AuthService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

interface TimesheetEntry {
  id: string
  employee_id: string
  date: string
  clock_in?: string
  clock_out?: string
  break_hours: number
  actual_hours: number
  total_approved_hours: number
  status: string
  is_approved: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  notes?: string
  admin_notes?: string
  rejection_reason?: string
  total_calls_taken?: number
  leads_generated?: number
  shift_remarks?: string
  performance_rating?: number
  scheduled_start?: string
  scheduled_end?: string
  scheduled_hours?: number
  break_info: {
    break_start?: string
    break_end?: string
    break_hours: number
  }
  discrepancies: Discrepancy[]
  hasDiscrepancies: boolean
  highSeverityDiscrepancies: number
  mediumSeverityDiscrepancies: number
  lowSeverityDiscrepancies: number
}

interface Discrepancy {
  type: 'late_arrival' | 'early_departure' | 'missing_break' | 'excessive_break' | 'no_show' | 'overtime'
  severity: 'low' | 'medium' | 'high'
  message: string
  details?: any
}

interface TimesheetSummary {
  totalEntries: number
  totalHours: number
  totalApprovedHours: number
  totalBreakHours: number
  pendingApprovals: number
  approvedEntries: number
  rejectedEntries: number
  totalDiscrepancies: number
  highSeverityDiscrepancies: number
  onTimePercentage: number
}

export default function EmployeeTimesheet() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<TimesheetSummary>({
    totalEntries: 0,
    totalHours: 0,
    totalApprovedHours: 0,
    totalBreakHours: 0,
    pendingApprovals: 0,
    approvedEntries: 0,
    rejectedEntries: 0,
    totalDiscrepancies: 0,
    highSeverityDiscrepancies: 0,
    onTimePercentage: 0
  })
  const [viewMode, setViewMode] = useState<'overview' | 'history' | 'discrepancies'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null)
  const [showEntryDetails, setShowEntryDetails] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user) {
      router.push('/login')
    } else {
      setCurrentUser(user)
      loadTimesheetData()
    }
  }, [router, selectedMonth])

  const loadTimesheetData = async () => {
    try {
      setLoading(true)
      const user = AuthService.getCurrentUser()
      if (!user) return

      const startDate = getMonthStart(selectedMonth)
      const endDate = getMonthEnd(selectedMonth)

      const headers: Record<string, string> = {}
      if (user?.id) headers['authorization'] = `Bearer ${user.id}`

      // Load employee timesheet data
      const response = await fetch(`/api/employee/timesheet?start_date=${startDate}&end_date=${endDate}`, { headers })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTimesheetEntries(data.data || [])
          setSummary(data.summary || summary)
        }
      } else {
        console.error('Failed to load timesheet data:', response.status)
        toast.error('Failed to load timesheet data')
      }
    } catch (error) {
      console.error('Error loading timesheet data:', error)
      toast.error('Failed to load timesheet data')
    } finally {
      setLoading(false)
    }
  }


  const getMonthStart = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).toISOString().split('T')[0]
  }

  const getMonthEnd = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).toISOString().split('T')[0]
  }

  const handlePreviousMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    setSelectedMonth(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    setSelectedMonth(newDate)
  }

  const handleLogout = () => {
    AuthService.logout()
    router.push('/login')
  }

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>
      case 'pending':
        return <Badge variant="outline" className="border-yellow-200 text-yellow-700">Pending</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDiscrepancySeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High</Badge>
      case 'medium':
        return <Badge variant="outline" className="border-orange-200 text-orange-700 text-xs">Medium</Badge>
      case 'low':
        return <Badge variant="outline" className="border-blue-200 text-blue-700 text-xs">Low</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">{severity}</Badge>
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateShiftDuration = (entry: TimesheetEntry) => {
    if (!entry.clock_in) return '0h 0m'
    const startTime = new Date(entry.clock_in)
    const endTime = entry.clock_out ? new Date(entry.clock_out) : new Date()
    const durationMs = endTime.getTime() - startTime.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getEntriesForDate = (date: string) => {
    return timesheetEntries.filter(entry => entry.date === date)
  }

  const filteredTimesheetEntries = timesheetEntries.filter(entry => {
    if (!searchTerm) return true
    const date = formatDate(entry.date)
    const clockIn = entry.clock_in ? formatTime(entry.clock_in) : ''
    const status = entry.is_approved
    return date.toLowerCase().includes(searchTerm.toLowerCase()) ||
           clockIn.toLowerCase().includes(searchTerm.toLowerCase()) ||
           status.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handleViewEntryDetails = (entry: TimesheetEntry) => {
    setSelectedEntry(entry)
    setShowEntryDetails(true)
  }

  // Generate calendar days for the selected month
  const generateCalendarDays = () => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= lastDay || currentDate.getDay() !== 0) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  const calendarDays = generateCalendarDays()

  const exportTimesheet = () => {
    const csvContent = [
      ['Date', 'Clock In', 'Clock Out', 'Duration', 'Break Hours', 'Approval Status', 'Discrepancies'],
      ...timesheetEntries.map(entry => [
        formatDate(entry.date),
        entry.clock_in ? formatTime(entry.clock_in) : 'N/A',
        entry.clock_out ? formatTime(entry.clock_out) : 'Ongoing',
        calculateShiftDuration(entry),
        entry.break_hours.toString(),
        entry.is_approved,
        entry.discrepancies.length > 0 ? entry.discrepancies.map(d => d.message).join('; ') : 'None'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `employee-timesheet-${selectedMonth.toISOString().slice(0, 7)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Timesheet exported successfully!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timesheet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/employee/dashboard">
                <div className="flex items-center">
                  <ArrowLeft className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="text-xl font-bold text-gray-900">My Timesheet</span>
                </div>
              </Link>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Clock className="h-3 w-3 mr-1" />
                Employee Time Tracking
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {currentUser?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Navigation and Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Month
            </Button>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900">
                {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-sm text-gray-600">Your professional timesheet</p>
            </div>
            <Button variant="outline" onClick={handleNextMonth}>
              Next Month
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={exportTimesheet}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Entries</p>
                  <p className="text-2xl font-bold">{summary.totalEntries}</p>
                </div>
                <Calendar className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Hours</p>
                  <p className="text-2xl font-bold">{(Number(summary.totalHours) || 0).toFixed(1)}h</p>
                </div>
                <Clock className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Break Hours</p>
                  <p className="text-2xl font-bold">{(Number(summary.totalBreakHours) || 0).toFixed(1)}h</p>
                </div>
                <Coffee className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Approved</p>
                  <p className="text-2xl font-bold">{summary.approvedEntries}</p>
                </div>
                <CheckCircle className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Pending</p>
                  <p className="text-2xl font-bold">{summary.pendingApprovals}</p>
                </div>
                <Clock3 className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Issues</p>
                  <p className="text-2xl font-bold">{summary.totalDiscrepancies}</p>
                </div>
                <AlertCircle className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="discrepancies" className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Issues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Current Status
                  </CardTitle>
                  <CardDescription>
                    Your current shift and approval status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <Clock className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Ready to Work</h3>
                    <p className="text-blue-700 mb-4">Your timesheet is up to date and ready for review</p>
                    <div className="flex justify-center space-x-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {summary.approvedEntries} Approved
                      </Badge>
                      {summary.pendingApprovals > 0 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <Clock3 className="h-3 w-3 mr-1" />
                          {summary.pendingApprovals} Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>
                    Your attendance and efficiency indicators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">On-Time Rate</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${summary.onTimePercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{summary.onTimePercentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Hours This Month</span>
                      <span className="text-sm font-medium text-blue-600">{summary.totalHours.toFixed(1)}h</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Break Time Used</span>
                      <span className="text-sm font-medium text-orange-600">{summary.totalBreakHours.toFixed(1)}h</span>
                    </div>
                    
                    {summary.totalDiscrepancies > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Issues to Address</span>
                        <span className="text-sm font-medium text-red-600">{summary.totalDiscrepancies}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Entries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Recent Entries
                </CardTitle>
                <CardDescription>
                  Your most recent timesheet entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timesheetEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-gray-900">{formatDate(entry.date)}</span>
                        </div>
                        {entry.hasDiscrepancies && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {entry.clock_in ? formatTime(entry.clock_in) : 'N/A'} - {entry.clock_out ? formatTime(entry.clock_out) : 'Ongoing'}
                          </div>
                          <div className="text-xs text-gray-400">{calculateShiftDuration(entry)}</div>
                        </div>
                        {getApprovalStatusBadge(entry.is_approved)}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewEntryDetails(entry)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {timesheetEntries.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No timesheet entries found for this period.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Timesheet History
                </CardTitle>
                <CardDescription>
                  Complete history of your timesheet entries with approval status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search by date, time, or status..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>

                <div className="space-y-3">
                  {filteredTimesheetEntries.map((entry) => (
                    <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-gray-900">{formatDate(entry.date)}</span>
                          </div>
                          {getApprovalStatusBadge(entry.is_approved)}
                          {entry.hasDiscrepancies && (
                            <Badge variant="outline" className="border-red-200 text-red-700 text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {entry.discrepancies.length} Issues
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Duration</div>
                          <div className="font-medium text-gray-900">{calculateShiftDuration(entry)}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <div className="text-gray-500">Clock In</div>
                          <div className="font-medium">{entry.clock_in ? formatTime(entry.clock_in) : 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Clock Out</div>
                          <div className="font-medium">
                            {entry.clock_out ? formatTime(entry.clock_out) : 'Ongoing'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Break Time</div>
                          <div className="font-medium">{entry.break_hours.toFixed(1)}h</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Total Hours</div>
                          <div className="font-medium">{entry.actual_hours.toFixed(1)}h</div>
                        </div>
                      </div>

                      {/* Show scheduled vs actual if available */}
                      {entry.scheduled_start && entry.scheduled_end && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Scheduled vs Actual:</div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Scheduled: </span>
                              <span className="font-medium">{entry.scheduled_start} - {entry.scheduled_end}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Actual: </span>
                              <span className="font-medium">
                                {entry.clock_in ? formatTime(entry.clock_in) : 'N/A'} - {entry.clock_out ? formatTime(entry.clock_out) : 'Ongoing'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show discrepancies if any */}
                      {entry.hasDiscrepancies && (
                        <div className="mb-3 pt-3 border-t border-gray-100">
                          <div className="text-sm text-gray-500 mb-2">Issues Detected:</div>
                          <div className="space-y-1">
                            {entry.discrepancies.map((discrepancy, index) => (
                              <div key={index} className="flex items-center justify-between text-xs bg-red-50 rounded p-2">
                                <div className="flex items-center space-x-2">
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-red-900">{discrepancy.message}</span>
                                </div>
                                {getDiscrepancySeverityBadge(discrepancy.severity)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show admin notes if any */}
                      {entry.admin_notes && (
                        <div className="mb-3 pt-3 border-t border-gray-100">
                          <div className="text-sm text-gray-500 mb-1">Admin Notes:</div>
                          <div className="text-sm text-gray-700 bg-blue-50 p-2 rounded">{entry.admin_notes}</div>
                        </div>
                      )}

                      {/* Show rejection reason if rejected */}
                      {entry.is_approved === 'rejected' && entry.rejection_reason && (
                        <div className="mb-3 pt-3 border-t border-gray-100">
                          <div className="text-sm text-gray-500 mb-1">Rejection Reason:</div>
                          <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{entry.rejection_reason}</div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewEntryDetails(entry)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredTimesheetEntries.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No timesheet entries found for this period.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discrepancies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Discrepancy Issues
                </CardTitle>
                <CardDescription>
                  Issues detected in your timesheet entries that need attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary.totalDiscrepancies > 0 ? (
                  <div className="space-y-4">
                    {/* Summary of issues */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-2xl font-bold text-red-600">{summary.highSeverityDiscrepancies}</div>
                        <div className="text-sm text-red-700">High Priority</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="text-2xl font-bold text-orange-600">
                          {summary.totalDiscrepancies - summary.highSeverityDiscrepancies}
                        </div>
                        <div className="text-sm text-orange-700">Medium/Low Priority</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">{summary.totalDiscrepancies}</div>
                        <div className="text-sm text-blue-700">Total Issues</div>
                      </div>
                    </div>

                    {/* List of entries with discrepancies */}
                    <div className="space-y-3">
                      {timesheetEntries.filter(entry => entry.hasDiscrepancies).map((entry) => (
                        <div key={entry.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                                <span className="font-medium text-gray-900">{formatDate(entry.date)}</span>
                              </div>
                              {getApprovalStatusBadge(entry.is_approved)}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Duration</div>
                              <div className="font-medium text-gray-900">{calculateShiftDuration(entry)}</div>
                            </div>
                          </div>
                          
                          {/* Show discrepancies */}
                          <div className="space-y-2">
                            {entry.discrepancies.map((discrepancy, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-3 h-3 rounded-full ${
                                    discrepancy.severity === 'high' ? 'bg-red-500' :
                                    discrepancy.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                                  }`}></div>
                                  <div>
                                    <div className="font-medium text-gray-900">{discrepancy.message}</div>
                                    {discrepancy.details && (
                                      <div className="text-sm text-gray-600">
                                        {discrepancy.type === 'late_arrival' && `Scheduled: ${discrepancy.details.scheduledTime}, Actual: ${discrepancy.details.actualTime}`}
                                        {discrepancy.type === 'early_departure' && `Scheduled: ${discrepancy.details.scheduledTime}, Actual: ${discrepancy.details.actualTime}`}
                                        {discrepancy.type === 'missing_break' && `Shift duration: ${discrepancy.details.scheduledHours}h, Break time: ${discrepancy.details.breakHours}h`}
                                        {discrepancy.type === 'excessive_break' && `Break time: ${discrepancy.details.breakHours}h (Max recommended: ${discrepancy.details.recommendedMax}h)`}
                                        {discrepancy.type === 'overtime' && `Actual: ${discrepancy.details.actualHours}h, Scheduled: ${discrepancy.details.scheduledHours}h`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {getDiscrepancySeverityBadge(discrepancy.severity)}
                              </div>
                            ))}
                          </div>

                          {/* Action required message */}
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm text-yellow-800">
                                Please discuss these issues with your manager to resolve any discrepancies.
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues Found</h3>
                    <p className="text-gray-500">Your timesheet entries are clean with no discrepancies detected.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Entry Details Modal */}
      {showEntryDetails && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Timesheet Entry Details</h3>
              <Button variant="outline" size="sm" onClick={() => setShowEntryDetails(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Date</label>
                  <div className="font-medium">{formatDate(selectedEntry.date)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Status</label>
                  <div>{getApprovalStatusBadge(selectedEntry.is_approved)}</div>
                </div>
              </div>

              {/* Time Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Clock In</label>
                  <div className="font-medium">{selectedEntry.clock_in ? formatTime(selectedEntry.clock_in) : 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Clock Out</label>
                  <div className="font-medium">{selectedEntry.clock_out ? formatTime(selectedEntry.clock_out) : 'Ongoing'}</div>
                </div>
              </div>

              {/* Hours Information */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Total Hours</label>
                  <div className="font-medium">{selectedEntry.actual_hours.toFixed(1)}h</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Break Hours</label>
                  <div className="font-medium">{selectedEntry.break_hours.toFixed(1)}h</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Work Hours</label>
                  <div className="font-medium">{selectedEntry.total_approved_hours.toFixed(1)}h</div>
                </div>
              </div>

              {/* Scheduled vs Actual */}
              {selectedEntry.scheduled_start && selectedEntry.scheduled_end && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm text-gray-500 mb-2 block">Scheduled vs Actual</label>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Scheduled: </span>
                      <span className="font-medium">{selectedEntry.scheduled_start} - {selectedEntry.scheduled_end}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Actual: </span>
                      <span className="font-medium">
                        {selectedEntry.clock_in ? formatTime(selectedEntry.clock_in) : 'N/A'} - {selectedEntry.clock_out ? formatTime(selectedEntry.clock_out) : 'Ongoing'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Discrepancies */}
              {selectedEntry.hasDiscrepancies && (
                <div>
                  <label className="text-sm text-gray-500 mb-2 block">Issues Detected</label>
                  <div className="space-y-2">
                    {selectedEntry.discrepancies.map((discrepancy, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-900">{discrepancy.message}</span>
                        </div>
                        {getDiscrepancySeverityBadge(discrepancy.severity)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Data */}
              {(selectedEntry.total_calls_taken || selectedEntry.leads_generated || selectedEntry.performance_rating) && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <label className="text-sm text-gray-500 mb-2 block">Performance Data</label>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {selectedEntry.total_calls_taken && (
                      <div>
                        <span className="text-gray-600">Calls Taken: </span>
                        <span className="font-medium">{selectedEntry.total_calls_taken}</span>
                      </div>
                    )}
                    {selectedEntry.leads_generated && (
                      <div>
                        <span className="text-gray-600">Leads Generated: </span>
                        <span className="font-medium">{selectedEntry.leads_generated}</span>
                      </div>
                    )}
                    {selectedEntry.performance_rating && (
                      <div>
                        <span className="text-gray-600">Rating: </span>
                        <span className="font-medium">{selectedEntry.performance_rating}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedEntry.shift_remarks && (
                <div>
                  <label className="text-sm text-gray-500 mb-2 block">Your Notes</label>
                  <div className="p-3 bg-gray-50 rounded text-sm">{selectedEntry.shift_remarks}</div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedEntry.admin_notes && (
                <div>
                  <label className="text-sm text-gray-500 mb-2 block">Admin Notes</label>
                  <div className="p-3 bg-blue-50 rounded text-sm">{selectedEntry.admin_notes}</div>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedEntry.is_approved === 'rejected' && selectedEntry.rejection_reason && (
                <div>
                  <label className="text-sm text-gray-500 mb-2 block">Rejection Reason</label>
                  <div className="p-3 bg-red-50 rounded text-sm text-red-700">{selectedEntry.rejection_reason}</div>
                </div>
              )}

              {/* Approval Info */}
              {selectedEntry.is_approved === 'approved' && selectedEntry.approved_at && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-700">
                    <strong>Approved</strong> on {new Date(selectedEntry.approved_at).toLocaleDateString()} at {new Date(selectedEntry.approved_at).toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

