"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/lib/auth'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, ArrowLeftRight, Sparkles } from 'lucide-react'
import {
  addDaysYmd,
  formatYmdDisplay,
  localTodayYmd,
  mondayOfWeekContaining,
  weekDayListMonSun,
} from '@/lib/calendar-date'

type Assignment = {
  id: string
  template_name: string
  start_time: string
  end_time: string
  date: string
  color?: string
  template_department?: string
}

type Employee = {
  id: string
  first_name: string
  last_name: string
  email: string
  employee_code: string
}

export default function EmployeeSchedulingPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<string>(() => localTodayYmd())
  const [todayYmd, setTodayYmd] = useState<string>(() => localTodayYmd())
  const [weekDays, setWeekDays] = useState<string[]>([])
  const [assignmentsByDate, setAssignmentsByDate] = useState<Record<string, Assignment[]>>({})
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Leave dialog
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveType, setLeaveType] = useState<'vacation' | 'sick' | 'personal' | 'bereavement' | 'other'>('vacation')
  const [leaveStart, setLeaveStart] = useState('')
  const [leaveEnd, setLeaveEnd] = useState('')
  const [leaveReason, setLeaveReason] = useState('')
  const [submittingLeave, setSubmittingLeave] = useState(false)

  // Swap dialog
  const [swapOpen, setSwapOpen] = useState(false)
  const [swapDate, setSwapDate] = useState('')
  const [swapTargetEmployeeId, setSwapTargetEmployeeId] = useState('')
  const [swapReason, setSwapReason] = useState('')
  const [submittingSwap, setSubmittingSwap] = useState(false)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUser(user)
  }, [router])

  useEffect(() => {
    const mon = mondayOfWeekContaining(selectedDate)
    setWeekDays(weekDayListMonSun(mon))
  }, [selectedDate])

  useEffect(() => {
    const tick = () => setTodayYmd(localTodayYmd())
    const id = setInterval(tick, 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // Load data when user or selectedDate changes
  useEffect(() => {
    if (!currentUser) return
    ;(async () => {
      try {
        setLoading(true)
        await Promise.all([
          loadWeek(currentUser.id, selectedDate),
          loadEmployees()
        ])
      } catch (e) {
        console.error(e)
        toast.error('Failed to load schedule')
      } finally {
        setLoading(false)
      }
    })()
  }, [currentUser, selectedDate])

  const loadEmployees = async () => {
    const user = AuthService.getCurrentUser()
    const headers: Record<string, string> = {}
    if (user?.id) headers['authorization'] = `Bearer ${user.id}`
    
    const res = await fetch('/api/scheduling/employees', { headers })
    const data = await res.json()
    if (data.success) {
      setEmployees(data.data)
    }
  }

  const loadWeek = async (employeeId: string, date: string) => {
    const user = AuthService.getCurrentUser()
    const headers: Record<string, string> = {}
    if (user?.id) headers['authorization'] = `Bearer ${user.id}`
    
    const res = await fetch(`/api/scheduling/week/${date}?employee_id=${employeeId}&published_only=true`, { headers })
    if (!res.ok) {
      console.error('Failed to load week data:', res.status, res.statusText)
      return
    }
    const data = await res.json()
    if (!data.success) {
      console.error('API returned error:', data.error)
      return
    }
    const schedule = data.data
    const me = (schedule.employees as any[]).find((e: any) => e.id === employeeId)
    let byDate: Record<string, Assignment[]> = me?.assignments || {}
    if (Object.keys(byDate).length === 0 && Array.isArray(schedule.assignments)) {
      const mine = (schedule.assignments as any[]).filter((a: any) => a.employee_id === employeeId)
      const built: Record<string, Assignment[]> = {}
      for (const a of mine) {
        const dv = a.date as string
        const dateKey = typeof dv === 'string' ? dv.split('T')[0] : new Date(dv).toISOString().split('T')[0]
        if (!built[dateKey]) built[dateKey] = []
        built[dateKey].push(a as Assignment)
      }
      byDate = built
    }
    setAssignmentsByDate(byDate)
  }

  const goPrev = () => {
    const mon = weekDays[0] || mondayOfWeekContaining(selectedDate)
    setSelectedDate(addDaysYmd(mon, -7))
  }

  const goNext = () => {
    const mon = weekDays[0] || mondayOfWeekContaining(selectedDate)
    setSelectedDate(addDaysYmd(mon, 7))
  }

  const goToday = () => {
    const t = localTodayYmd()
    setTodayYmd(t)
    setSelectedDate(t)
  }

  const handleRefresh = async () => {
    if (!currentUser) return
    setRefreshing(true)
    await loadWeek(currentUser.id, selectedDate)
    setRefreshing(false)
  }

  const requestLeave = async () => {
    if (!currentUser) return
    if (!leaveStart || !leaveEnd || !leaveReason) {
      toast.error('Please fill all leave fields')
      return
    }
    try {
      setSubmittingLeave(true)
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          employee_id: currentUser.id,
          leave_type: leaveType,
          start_date: leaveStart,
          end_date: leaveEnd,
          reason: leaveReason,
          status: 'pending'
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to submit leave request')
      }
      toast.success('Leave request submitted')
      setLeaveOpen(false)
      setLeaveReason('')
      await handleRefresh()
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Failed to submit leave request')
    } finally {
      setSubmittingLeave(false)
    }
  }

  const requestSwap = async () => {
    if (!currentUser) return
    if (!swapDate || !swapTargetEmployeeId || !swapReason) {
      toast.error('Please fill all swap fields')
      return
    }
    try {
      setSubmittingSwap(true)
      const res = await fetch('/api/shifts/swap-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          target_employee_id: swapTargetEmployeeId,
          reason: swapReason,
          swap_date: swapDate
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Failed to submit swap request')
      }
      toast.success('Swap request submitted')
      setSwapOpen(false)
      setSwapReason('')
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Failed to submit swap request')
    } finally {
      setSubmittingSwap(false)
    }
  }

  const prettyTime = (t?: string) => (t ? t.slice(0,5) : '')

  const hasAnyShift = useMemo(
    () => weekDays.some((d) => (assignmentsByDate[d] || []).length > 0),
    [weekDays, assignmentsByDate]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading your schedule...</p>
        </div>
      </div>
    )
  }

  const weekLabelStart = weekDays[0] ? formatYmdDisplay(weekDays[0], { month: 'short', day: 'numeric' }) : ''
  const weekLabelEnd = weekDays[6] ? formatYmdDisplay(weekDays[6], { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const thisWeek = weekDays[0] && weekDays[6] && todayYmd >= weekDays[0] && todayYmd <= weekDays[6]

  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/70 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-700">
            <Sparkles className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">Schedule</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">My weekly schedule</h1>
          <p className="text-slate-600">Published shifts — Monday through Sunday (your manager&apos;s rota)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="default" onClick={() => { setLeaveOpen(true); setLeaveStart(weekDays[0] || selectedDate); setLeaveEnd(weekDays[6] || selectedDate) }}>
            Request Leave
          </Button>
        </div>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200/60 shadow-md shadow-slate-200/40 transition-shadow duration-300 hover:shadow-lg">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-slate-900 sm:text-xl">
              <Calendar className="h-5 w-5 shrink-0 text-indigo-600" />
              <span>
                Week of{' '}
                <span className="font-semibold text-indigo-900">{weekLabelStart}</span>
                {' — '}
                <span className="font-semibold text-indigo-900">{weekLabelEnd}</span>
              </span>
              {thisWeek && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">This week</span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goPrev} aria-label="Previous week">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
              <Button variant="outline" size="sm" onClick={goNext} aria-label="Next week">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="animate-in fade-in duration-300 px-3 pb-4 pt-4 sm:px-6">
          {!hasAnyShift && (
            <p className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              No published shifts this week. If your manager has just published a rota, tap Refresh — otherwise you may be off the schedule for these dates.
            </p>
          )}
          <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] md:grid md:grid-cols-7 md:overflow-visible md:pb-0 md:snap-none">
            {weekDays.map((day) => {
              const isToday = day === todayYmd
              return (
              <div
                key={day}
                className={`min-w-[148px] shrink-0 snap-center rounded-xl border p-3 shadow-sm transition-all duration-200 md:min-w-0 ${
                  isToday
                    ? 'border-indigo-400/80 bg-gradient-to-b from-indigo-50 to-white ring-2 ring-indigo-200/80 shadow-indigo-100/50'
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-1">
                  <div className="text-sm font-semibold text-slate-800">
                    {formatYmdDisplay(day, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  {isToday && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Today</span>
                  )}
                </div>
                {(assignmentsByDate[day] || []).length === 0 ? (
                  <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-500">
                    No shift
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(assignmentsByDate[day] || []).map((a) => (
                      <div
                        key={a.id}
                        className="space-y-2 rounded-lg p-3 text-xs text-white shadow-md"
                        style={{ backgroundColor: a.color || '#4f46e5' }}
                      >
                        <div>
                          <div className="font-semibold leading-tight">{a.template_name}</div>
                          {a.template_department && (
                            <div className="mt-0.5 text-[11px] font-medium text-white/85">{a.template_department}</div>
                          )}
                          <div className="mt-1 font-mono tabular-nums text-white/95">
                            {prettyTime(a.start_time)} – {prettyTime(a.end_time)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full border-0 bg-white/95 text-slate-900 hover:bg-white"
                          onClick={() => { setSwapOpen(true); setSwapDate(day) }}
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Swap
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leave Request Dialog */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={leaveType} onValueChange={(v: any) => setLeaveType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="bereavement">Bereavement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Brief reason" />
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button>
            <Button onClick={requestLeave} disabled={submittingLeave}>{submittingLeave ? 'Submitting...' : 'Submit'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Swap Request Dialog */}
      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Request Swap</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Swap date</Label>
              <Input type="date" value={swapDate} onChange={(e) => setSwapDate(e.target.value)} />
            </div>
            <div>
              <Label>Target Employee</Label>
              <Select value={swapTargetEmployeeId} onValueChange={setSwapTargetEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.id !== currentUser?.id).map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea value={swapReason} onChange={(e) => setSwapReason(e.target.value)} placeholder="Why do you want to swap?" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSwapOpen(false)}>Cancel</Button>
            <Button onClick={requestSwap} disabled={submittingSwap}>{submittingSwap ? 'Submitting...' : 'Submit'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


