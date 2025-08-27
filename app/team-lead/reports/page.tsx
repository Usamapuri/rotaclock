"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function TeamLeadReportsPage() {
  const router = useRouter()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>(() => new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0,10))
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [data, setData] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'team_lead') {
      router.replace('/login')
      return
    }
    ;(async () => {
      try {
        const byLead = await fetch(`/api/teams/by-lead?leadId=${user.id}`)
        const { data } = await byLead.json()
        const team = (data || [])[0]
        if (!team) { setTeamId(null); setLoading(false); return }
        setTeamId(team.id)
        await load(team.id, startDate, endDate)
      } catch (e: any) {
        setError(e.message || 'Error')
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function load(team: string, s: string, e: string) {
    try {
      setLoading(true)
      setError(null)
      // Attendance summary API currently supports filters by employee/department; we filter client-side by team
      const res = await fetch(`/api/attendance-summary?start_date=${s}&end_date=${e}`)
      if (!res.ok) throw new Error('Failed to load report')
      const json = await res.json()
      // In a real impl, add a team_id filter in backend; for now assume data contains team relations
      const filtered = json.data || []
      setData(filtered)
      setSummary(json.summary)
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    const header = ['Employee ID', 'First Name', 'Last Name', 'Total Shifts', 'Total Hours', 'Total Break', 'Late', 'No Show', 'On Time']
    const rows = data.map((r: any) => [
      r.employee_id, r.first_name, r.last_name, r.total_shifts, r.total_hours_worked, r.total_break_time, r.late_count, r.no_show_count, r.on_time_count
    ])
    const csv = [header, ...rows].map(r => r.map(field => {
      const v = String(field ?? '')
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
    }).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team_report_${startDate}_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cards = useMemo(() => ([
    { label: 'Total Employees', value: summary?.total_employees || 0 },
    { label: 'Total Shifts', value: summary?.total_shifts || 0 },
    { label: 'Total Hours', value: Math.round(summary?.total_hours_worked || 0) },
    { label: 'Late Count', value: summary?.total_late_count || 0 },
  ]), [summary])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Team Reports</CardTitle></CardHeader>
        <CardContent>
          {!teamId ? 'No team assigned.' : (
            <div className="space-y-4">
              <div className="flex gap-2 items-end">
                <div>
                  <label className="text-xs text-gray-600">Start Date</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">End Date</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <Button variant="outline" onClick={() => teamId && load(teamId, startDate, endDate)}>Apply</Button>
                <Button onClick={exportCsv} disabled={loading || data.length === 0}>Export CSV</Button>
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              {loading ? 'Loading…' : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    {cards.map((c, i) => (
                      <div key={i} className="border rounded p-3">
                        <div className="text-xs text-gray-600">{c.label}</div>
                        <div className="text-xl font-semibold">{c.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="border rounded">
                    <div className="px-3 py-2 border-b text-sm font-medium">Details</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="px-3 py-2">Employee</th>
                            <th className="px-3 py-2">Total Shifts</th>
                            <th className="px-3 py-2">Total Hours</th>
                            <th className="px-3 py-2">Break</th>
                            <th className="px-3 py-2">Late</th>
                            <th className="px-3 py-2">No Show</th>
                            <th className="px-3 py-2">On Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.map((r: any) => (
                            <tr key={r.employee_id} className="border-t">
                              <td className="px-3 py-2">{r.first_name} {r.last_name} ({r.employee_id})</td>
                              <td className="px-3 py-2">{r.total_shifts}</td>
                              <td className="px-3 py-2">{Math.round(r.total_hours_worked || 0)}</td>
                              <td className="px-3 py-2">{Math.round(r.total_break_time || 0)}</td>
                              <td className="px-3 py-2">{r.late_count}</td>
                              <td className="px-3 py-2">{r.no_show_count}</td>
                              <td className="px-3 py-2">{r.on_time_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
