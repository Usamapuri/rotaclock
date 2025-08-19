"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthService } from "@/lib/auth"

type Team = { id: string; name: string; project_id?: string | null }
type Project = { id: string; name: string }
type Member = { id: string; first_name: string; last_name: string; status: 'online' | 'break' | 'offline' }

export default function PMLivePage() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string>('all')
  const [teamMembers, setTeamMembers] = useState<Record<string, Member[]>>({})

  useEffect(() => {
    async function load() {
      const user = AuthService.getCurrentUser()
      if (!user?.id) return
      const res = await fetch(`/api/teams/by-manager?managerId=${user.id}`)
      const data = await res.json()
      const t: Team[] = data?.data || []
      setTeams(t)
      const projRes = await fetch('/api/project-manager/projects', { headers: { 'authorization': `Bearer ${user.id || ''}` } })
      const projData = await projRes.json()
      setProjects([{ id: 'all', name: 'All Projects' } as any, ...(projData?.data || [])])
      const membersByTeam: Record<string, Member[]> = {}
      for (const team of t) {
        const liveRes = await fetch(`/api/teams/${team.id}/live-status`)
        const live = await liveRes.json()
        membersByTeam[team.id] = (live?.data?.members || [])
      }
      setTeamMembers(membersByTeam)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Skeleton className="h-40" />

  const visibleTeams = projectId === 'all' ? teams : teams.filter(t => t.project_id === projectId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select className="border rounded px-2 py-1" value={projectId} onChange={e => setProjectId(e.target.value)}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="grid gap-4 grid-cols-1">
      {visibleTeams.map(team => (
        <Card key={team.id}>
          <CardHeader><CardTitle>{team.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {teamMembers[team.id]?.map(m => (
                <div key={m.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="text-sm font-medium">{m.first_name} {m.last_name}</div>
                  <Badge variant={m.status === 'online' ? 'default' : (m.status === 'break' ? 'secondary' : 'outline')}>
                    {m.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  )
}


