"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useTeamEvents } from "@/lib/hooks/use-team-events"
import { ConnectionStatus } from "@/components/ui/connection-status"
import { Users, MessageSquare, TrendingUp, Settings, UserPlus, ArrowRight } from "lucide-react"

type TeamMember = {
  id: string
  first_name: string
  last_name: string
  status: 'online' | 'break' | 'offline'
  clock_in?: string
}

export default function TeamLeadDashboardPage() {
  const router = useRouter()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamInfo, setTeamInfo] = useState<any>(null)
  const [kpis, setKpis] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'team_lead') {
      router.replace('/team-lead/login')
      return
    }
    ;(async () => {
      try {
        setError(null)
        const byLead = await fetch(`/api/teams/by-lead?leadId=${user.id}`)
        const { data } = await byLead.json()
        const team = (data || [])[0]
        if (!team) { setTeamId(null); setLoading(false); return }
        setTeamId(team.id)
        setTeamInfo(team)
        
        const [liveRes, perfRes, membersRes] = await Promise.all([
          fetch(`/api/teams/${team.id}/live-status`),
          fetch(`/api/performance-metrics/team/${team.id}`),
          fetch(`/api/teams/${team.id}/members`)
        ])
        
        if (!liveRes.ok || !perfRes.ok) throw new Error('Failed to load KPIs')
        
        const live = await liveRes.json()
        const perf = await perfRes.json()
        const members = await membersRes.json()
        
        setTeamMembers(live?.data?.members || [])
        setKpis({
          members: live.data?.stats?.total_members || 0,
          online: live.data?.stats?.online || 0,
          onBreak: live.data?.stats?.on_break || 0,
          avgCalls: Math.round(perf.data?.teamStats?.avg_calls_handled || 0),
          avgAht: Math.round(perf.data?.teamStats?.avg_handle_time || 0),
          avgCsat: Number(perf.data?.teamStats?.avg_customer_satisfaction || 0).toFixed(2),
          avgFcr: Number(perf.data?.teamStats?.avg_fcr_rate || 0).toFixed(1),
        })
      } catch (e: any) {
        setError(e.message || 'Error')
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  const events = useTeamEvents(teamId)

  const liveKpis = useMemo(() => ({
    members: events.stats?.total_members ?? kpis.members ?? 0,
    online: events.stats?.online ?? kpis.online ?? 0,
    onBreak: events.stats?.on_break ?? kpis.onBreak ?? 0,
  }), [events.stats, kpis])

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-28 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!teamId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">You are not assigned to any team yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Please contact your project manager.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Lead Dashboard</h1>
          {teamInfo && (
            <p className="text-muted-foreground">
              Managing: {teamInfo.name}
              {teamInfo.department && ` • ${teamInfo.department}`}
            </p>
          )}
        </div>
        <ConnectionStatus
          isConnected={events.isConnected}
          isConnecting={events.isConnecting}
          error={events.error}
          lastUpdate={events.lastUpdate}
          onReconnect={events.connect}
        />
      </div>

      {/* Live Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveKpis.members}</div>
            <p className="text-xs text-muted-foreground">
              Total team size
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveKpis.online}</div>
            <p className="text-xs text-muted-foreground">
              Currently working
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Break</CardTitle>
            <Badge variant="secondary">Break</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveKpis.onBreak}</div>
            <p className="text-xs text-muted-foreground">
              Taking breaks
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgCalls}</div>
            <p className="text-xs text-muted-foreground">
              Per agent today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Handle Time (s)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgAht}</div>
            <p className="text-xs text-muted-foreground">
              Average call duration
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgCsat}</div>
            <p className="text-xs text-muted-foreground">
              Average CSAT score
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">First Call Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgFcr}%</div>
            <p className="text-xs text-muted-foreground">
              FCR rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
            <Link href="/team-lead/live">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Live Monitoring
              </Button>
            </Link>
            <Link href="/team-lead/communications">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Team Communications
              </Button>
            </Link>
            <Link href="/team-lead/performance">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                Performance Metrics
              </Button>
            </Link>
            <Link href="/team-lead/team">
              <Button variant="outline" className="w-full justify-start">
                <UserPlus className="h-4 w-4 mr-2" />
                Team Management
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Status */}
      {teamMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Team Members Status</span>
              <Link href="/team-lead/team">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {teamMembers.slice(0, 6).map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{member.first_name} {member.last_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={member.status === 'online' ? 'default' : member.status === 'break' ? 'secondary' : 'outline'}
                        className={member.status === 'online' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {member.status}
                      </Badge>
                      {member.clock_in && (
                        <span className="text-xs text-muted-foreground">
                          Since {new Date(member.clock_in).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
