"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTeamEvents } from "@/lib/hooks/use-team-events"
import { ConnectionStatus } from "@/components/ui/connection-status"

interface MemberStatus { id: string; first_name: string; last_name: string; employee_id: string; status: string }

export default function TeamLeadLiveStatusPage() {
  const router = useRouter()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'team_lead') {
      router.replace('/team-lead/login')
      return
    }
    ;(async () => {
      try {
        const byLead = await fetch(`/api/teams/by-lead?leadId=${user.id}`)
        const { data } = await byLead.json()
        const team = (data || [])[0]
        if (!team) { setTeamId(null); setInitialLoading(false); return }
        setTeamId(team.id)
      } catch (e: any) {
        setError(e.message || 'Error')
      } finally {
        setInitialLoading(false)
      }
    })()
  }, [router])

  const events = useTeamEvents(teamId)

  const members = (events.members || []) as MemberStatus[]
  const stats = events.stats

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Live Status</CardTitle>
          <ConnectionStatus
            isConnected={events.isConnected}
            isConnecting={events.isConnecting}
            error={events.error}
            lastUpdate={events.lastUpdate}
            onReconnect={events.connect}
          />
        </CardHeader>
        <CardContent>
          {!teamId ? (
            'No team assigned.'
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : initialLoading ? (
            'Loading…'
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="border rounded p-3"><div className="text-xs text-gray-600">Online</div><div className="text-2xl font-semibold">{stats?.online || 0}</div></div>
                <div className="border rounded p-3"><div className="text-xs text-gray-600">On Break</div><div className="text-2xl font-semibold">{stats?.on_break || 0}</div></div>
                <div className="border rounded p-3"><div className="text-xs text-gray-600">Offline</div><div className="text-2xl font-semibold">{stats?.offline || 0}</div></div>
                <div className="border rounded p-3"><div className="text-xs text-gray-600">Members</div><div className="text-2xl font-semibold">{stats?.total_members || 0}</div></div>
              </div>
              <div className="border rounded">
                <div className="px-3 py-2 border-b text-sm font-medium">Members (Realtime)</div>
                <ul className="divide-y">
                  {members.map(m => (
                    <li key={m.id} className="px-3 py-2 flex justify-between text-sm">
                      <span>{m.first_name} {m.last_name} <span className="text-gray-500">({m.employee_id})</span></span>
                      <span className="uppercase text-xs text-gray-600">{m.status}</span>
                    </li>
                  ))}
                </ul>
                {!events.isConnected && <div className="px-3 py-2 text-xs text-gray-500">Reconnecting…</div>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
