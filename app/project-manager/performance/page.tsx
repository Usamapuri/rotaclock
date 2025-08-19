"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthService } from "@/lib/auth"

type Team = { id: string; name: string; project_id?: string | null }
type Project = { id: string; name: string }

export default function PMPerformancePage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string>('all')
  const [selectedTeamId, setSelectedTeamId] = useState<string | 'all'>('all')
  const [start, setStart] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [end, setEnd] = useState<string>(new Date().toISOString().split('T')[0])
  const [agg, setAgg] = useState<{ calls: number; aht: number; csat: number; fcr: number }>({ calls: 0, aht: 0, csat: 0, fcr: 0 })

  useEffect(() => {
    async function init() {
      const user = AuthService.getCurrentUser()
      if (!user?.id) return
      const res = await fetch(`/api/teams/by-manager?managerId=${user.id}`)
      const data = await res.json()
      setTeams(data?.data || [])
      const projRes = await fetch('/api/project-manager/projects', { headers: { 'authorization': `Bearer ${user.id || ''}` } })
      const projData = await projRes.json()
      setProjects([{ id: 'all', name: 'All Projects' } as any, ...(projData?.data || [])])
    }
    init()
  }, [])

  useEffect(() => {
    async function load() {
      const scopeTeams = projectId === 'all' ? teams : teams.filter(t => t.project_id === projectId)
      const targetTeams = scopeTeams.filter(t => selectedTeamId === 'all' || t.id === selectedTeamId)
      let totalCalls = 0
      let totalAht = 0
      let totalCsat = 0
      let totalFcr = 0
      let count = 0
      for (const t of targetTeams) {
        const r = await fetch(`/api/performance-metrics/team/${t.id}?start_date=${start}&end_date=${end}`)
        const d = await r.json()
        const s = d?.data?.teamStats
        if (s) {
          totalCalls += Number(s.total_calls_handled || 0)
          totalAht += Number(s.avg_handle_time || 0)
          totalCsat += Number(s.avg_customer_satisfaction || 0)
          totalFcr += Number(s.avg_fcr_rate || 0)
          count++
        }
      }
      setAgg({ calls: totalCalls, aht: count ? totalAht / count : 0, csat: count ? totalCsat / count : 0, fcr: count ? totalFcr / count : 0 })
    }
    if (teams.length) load()
  }, [teams, selectedTeamId, start, end])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select className="border rounded px-3 py-2" value={projectId} onChange={e => setProjectId(e.target.value)}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="border rounded px-3 py-2" value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value as any)}>
          <option value="all">All Teams</option>
          {(projectId === 'all' ? teams : teams.filter(t => t.project_id === projectId)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="date" value={start} onChange={e => setStart(e.target.value)} className="border rounded px-2 py-1" />
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border rounded px-2 py-1" />
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Total Calls</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{Math.round(agg.calls)}</CardContent></Card>
        <Card><CardHeader><CardTitle>AHT</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{agg.aht.toFixed(1)}s</CardContent></Card>
        <Card><CardHeader><CardTitle>CSAT</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{agg.csat.toFixed(1)}%</CardContent></Card>
        <Card><CardHeader><CardTitle>FCR</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{agg.fcr.toFixed(1)}%</CardContent></Card>
      </div>
    </div>
  )
}


