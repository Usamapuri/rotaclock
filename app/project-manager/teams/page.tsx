"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthService } from "@/lib/auth"

type Team = { id: string; name: string; department?: string; description?: string }

export default function PMTeamsPage() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [transfer, setTransfer] = useState<{ employeeId: string; targetTeamId: string }>({ employeeId: '', targetTeamId: '' })

  useEffect(() => {
    async function load() {
      const user = AuthService.getCurrentUser()
      if (!user?.id) return
      const res = await fetch(`/api/teams/by-manager?managerId=${user.id}`)
      const data = await res.json()
      setTeams(data?.data || [])
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
              <input className="border rounded px-2 py-1" placeholder="Employee UUID" value={transfer.employeeId} onChange={e => setTransfer(s => ({ ...s, employeeId: e.target.value }))} />
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
                    alert('Transferred')
                  } else {
                    const e = await res.json().catch(()=>({}))
                    alert('Failed: ' + (e?.error || res.status))
                  }
                }}>Transfer</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


