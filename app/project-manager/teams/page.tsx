"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthService } from "@/lib/auth"

type Team = { id: string; name: string; department?: string; description?: string }

export default function PMTeamsPage() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [transfer, setTransfer] = useState<{ employeeId: string; targetTeamId: string }>({ employeeId: '', targetTeamId: '' })
  const [assign, setAssign] = useState<{ teamId: string; projectId: string }>({ teamId: '', projectId: '' })
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    async function load() {
      const user = AuthService.getCurrentUser()
      if (!user?.id) return
      const [teamsRes, projectsRes] = await Promise.all([
        fetch(`/api/teams/by-manager?managerId=${user.id}`),
        fetch(`/api/project-manager/projects`, { headers: { 'authorization': `Bearer ${user.id}` } })
      ])
      const teamsData = await teamsRes.json()
      const projectsData = await projectsRes.json()
      setTeams(teamsData?.data || [])
      setProjects(projectsData?.data?.map((p: any) => ({ id: p.id, name: p.name })) || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <Skeleton className="h-40" />
  }

  if (teams.length === 0) {
    return <div className="text-sm text-muted-foreground">No teams assigned yet.</div>
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      {teams.map(t => (
        <Card key={t.id}>
          <CardHeader>
            <CardTitle>{t.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">{t.department || '—'}</div>
            <div className="mt-2 text-sm">{t.description || ''}</div>
            <div className="mt-4 grid gap-2">
              <div className="text-sm font-medium">Transfer Employee to this Team</div>
              <Input placeholder="Employee UUID" value={transfer.employeeId} onChange={e => setTransfer(s => ({ ...s, employeeId: e.target.value }))} />
              <div className="flex gap-2 items-center">
                <Button size="sm" onClick={async () => {
                  const user = AuthService.getCurrentUser()
                  const res = await fetch('/api/project-manager/teams/transfer-employee', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'authorization': `Bearer ${user?.id || ''}`
                    },
                    body: JSON.stringify({ employee_id: transfer.employeeId, target_team_id: t.id })
                  })
                  if (res.ok) {
                    toast.success('Transferred')
                  } else {
                    const e = await res.json().catch(()=>({}))
                    toast.error(e?.error || String(res.status))
                  }
                }}>Transfer</Button>
              </div>
              <div className="mt-6 text-sm font-medium">Assign Team to a Managed Project</div>
              <div className="flex items-center gap-2">
                <Select onValueChange={(value) => setAssign({ teamId: t.id, projectId: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={async () => {
                  if (!assign.projectId) { toast.error('Choose a project'); return }
                  const user = AuthService.getCurrentUser()
                  const res = await fetch('/api/project-manager/projects/assign-team', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${user?.id || ''}` },
                    body: JSON.stringify({ project_id: assign.projectId, team_id: t.id })
                  })
                  if (res.ok) {
                    toast.success('Team assigned to project')
                  } else {
                    const e = await res.json().catch(()=>({}))
                    toast.error(e?.error || String(res.status))
                  }
                }}>Assign</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


