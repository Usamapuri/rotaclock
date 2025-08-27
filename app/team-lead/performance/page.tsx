"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"

interface Metric { id: string; date: string; calls_handled: number; avg_handle_time: number; customer_satisfaction: number; first_call_resolution_rate: number }

export default function TeamLeadPerformancePage() {
  const router = useRouter()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [teamStats, setTeamStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0,10))
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0,10))

  async function load(team: string, s?: string, e?: string) {
    try {
      setLoading(true)
      setError(null)
      const url = new URL(window.location.origin + `/api/performance-metrics/team/${team}`)
      if (s) url.searchParams.set('start_date', s)
      if (e) url.searchParams.set('end_date', e)
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Failed to load metrics')
      const json = await res.json()
      setMetrics(json.data?.members || [])
      setTeamStats(json.data?.teamStats || null)
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

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
        if (!team) {
          setTeamId(null)
          setLoading(false)
          return
        }
        setTeamId(team.id)
        await load(team.id, startDate, endDate)
      } catch (e: any) {
        setError(e.message || 'Error')
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const chartData = useMemo(() => {
    return metrics.slice().reverse().map(m => ({
      date: m.date,
      calls: m.calls_handled,
      aht: m.avg_handle_time,
      csat: Number(m.customer_satisfaction || 0),
      fcr: Number(m.first_call_resolution_rate || 0),
    }))
  }, [metrics])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {!teamId ? (
            'No team assigned.'
          ) : (
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
                <button className="px-3 py-2 border rounded" onClick={() => teamId && load(teamId, startDate, endDate)}>Apply</button>
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              {loading ? (
                <div>Loading…</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="border rounded p-3">
                      <div className="text-xs text-gray-600">Avg Calls</div>
                      <div className="text-xl font-semibold">{Math.round(teamStats?.avg_calls_handled || 0)}</div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="text-xs text-gray-600">Avg Handle Time (s)</div>
                      <div className="text-xl font-semibold">{Math.round(teamStats?.avg_handle_time || 0)}</div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="text-xs text-gray-600">Avg CSAT</div>
                      <div className="text-xl font-semibold">{(teamStats?.avg_customer_satisfaction || 0).toFixed(2)}</div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="text-xs text-gray-600">Avg FCR %</div>
                      <div className="text-xl font-semibold">{(teamStats?.avg_fcr_rate || 0).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <div className="text-sm font-medium mb-2">Volume & Efficiency</div>
                      <ChartContainer config={{ calls: { label: 'Calls', color: '#3b82f6' }, aht: { label: 'Avg Handle Time', color: '#10b981' } }}>
                        <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line dataKey="calls" stroke="var(--color-calls)" dot={false} strokeWidth={2} />
                          <Line dataKey="aht" stroke="var(--color-aht)" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ChartContainer>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Quality & Resolution</div>
                      <ChartContainer config={{ csat: { label: 'CSAT', color: '#f59e0b' }, fcr: { label: 'FCR %', color: '#ef4444' } }}>
                        <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line dataKey="csat" stroke="var(--color-csat)" dot={false} strokeWidth={2} />
                          <Line dataKey="fcr" stroke="var(--color-fcr)" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ChartContainer>
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
