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
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner"
import { Users, MessageSquare, TrendingUp, Settings, UserPlus, ArrowRight, Clock, Calendar, FileText, AlertCircle } from "lucide-react"

type TeamMember = {
  id: string
  first_name: string
  last_name: string
  email: string
  status?: 'online' | 'break' | 'offline'
  clock_in?: string
}

type SwapRequest = {
  id: string
  requester_first_name: string
  requester_last_name: string
  target_first_name: string
  target_last_name: string
  status: 'pending' | 'approved' | 'denied'
  created_at: string
}

type LeaveRequest = {
  id: string
  first_name: string
  last_name: string
  type: string
  start_date: string
  end_date: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export default function TeamLeadDashboardPage() {
  const router = useRouter()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamInfo, setTeamInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'team_lead') {
      router.replace('/login')
      return
    }
    ;(async () => {
      try {
        setError(null)
        console.log('🔍 Loading dashboard data for user:', user.id)
        
        // First, get the team information using the same logic as team overview
        const teamRes = await fetch(`/api/teams/by-lead?leadId=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${user.id}`
          }
        })
        
        if (teamRes.ok) {
          const teamJson = await teamRes.json()
          const team = teamJson.data?.[0]
          if (team) {
            setTeamId(team.id)
            setTeamInfo(team)
            console.log('✅ Team found:', team.id, team.name)
          } else {
            console.log('⚠️ No team found for user')
            setTeamId(null)
          }
        } else {
          console.log('⚠️ Could not fetch team info')
          setTeamId(null)
        }
        
        // Load team data using the Team Lead-specific APIs
        console.log('🔄 Loading team data using Team Lead APIs...')
        
        const [membersRes, swapRes, leaveRes] = await Promise.all([
          fetch(`/api/team-lead/team/members`, {
            headers: {
              'Authorization': `Bearer ${user.id}`
            }
          }),
          fetch(`/api/team-lead/shifts/swap-requests`, {
            headers: {
              'Authorization': `Bearer ${user.id}`
            }
          }),
          fetch(`/api/team-lead/leave-requests`, {
            headers: {
              'Authorization': `Bearer ${user.id}`
            }
          })
        ])
        
        // Check each response individually
        if (!membersRes.ok) {
          const errorText = await membersRes.text()
          console.error('❌ Failed to load members:', membersRes.status, errorText)
          throw new Error(`Failed to load members: ${membersRes.status}`)
        }
        
        if (!swapRes.ok) {
          const errorText = await swapRes.text()
          console.error('❌ Failed to load swap requests:', swapRes.status, errorText)
          throw new Error(`Failed to load swap requests: ${swapRes.status}`)
        }
        
        if (!leaveRes.ok) {
          const errorText = await leaveRes.text()
          console.error('❌ Failed to load leave requests:', leaveRes.status, errorText)
          throw new Error(`Failed to load leave requests: ${leaveRes.status}`)
        }
        
        console.log('✅ All API calls successful, parsing responses...')
        
        const [membersJson, swapJson, leaveJson] = await Promise.all([
          membersRes.json(),
          swapRes.json(),
          leaveRes.json()
        ])
        
        console.log('📊 Data loaded:', {
          members: membersJson.data?.length || 0,
          swapRequests: swapJson.data?.length || 0,
          leaveRequests: leaveJson.data?.length || 0
        })
        
        setTeamMembers(membersJson.data || [])
        setSwapRequests(swapJson.data || [])
        setLeaveRequests(leaveJson.data || [])
        
        console.log('✅ All data set successfully')
      } catch (e: any) {
        console.error('❌ Error in useEffect:', e)
        setError(e.message || "Error loading dashboard data")
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  const events = useTeamEvents(teamId)

  // Calculate KPIs from the data
  const kpis = useMemo(() => {
    const totalMembers = teamMembers.length
    const pendingSwapRequests = swapRequests.filter(req => req.status === 'pending').length
    const pendingLeaveRequests = leaveRequests.filter(req => req.status === 'pending').length
    
    // Mock performance data for now
    const avgCalls = Math.floor(Math.random() * 20) + 10 // 10-30 calls
    const avgAht = Math.floor(Math.random() * 300) + 180 // 3-8 minutes
    const avgCsat = (Math.random() * 2 + 3).toFixed(1) // 3.0-5.0
    const avgFcr = (Math.random() * 20 + 70).toFixed(1) // 70-90%
    
    return {
      members: totalMembers,
      online: Math.floor(totalMembers * 0.8), // 80% online
      onBreak: Math.floor(totalMembers * 0.1), // 10% on break
      avgCalls,
      avgAht,
      avgCsat,
      avgFcr,
      pendingSwapRequests,
      pendingLeaveRequests
    }
  }, [teamMembers, swapRequests, leaveRequests])

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
      {/* Impersonation Banner - Only shows when admin is impersonating */}
      <ImpersonationBanner />
      
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

      {/* Pending Requests Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Swap Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pendingSwapRequests}</div>
            <p className="text-xs text-muted-foreground">
              Need your approval
            </p>
            {kpis.pendingSwapRequests > 0 && (
              <Link href="/team-lead/team">
                <Button variant="outline" size="sm" className="mt-2">
                  Review Requests <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leave Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pendingLeaveRequests}</div>
            <p className="text-xs text-muted-foreground">
              Need your approval
            </p>
            {kpis.pendingLeaveRequests > 0 && (
              <Link href="/team-lead/team">
                <Button variant="outline" size="sm" className="mt-2">
                  Review Requests <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
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
            <Link href="/team-lead/team">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Team Management
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
            <Link href="/team-lead/reports">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Reports & Analytics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Swap Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Swap Requests
              </span>
              <Link href="/team-lead/team">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {swapRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No swap requests</p>
            ) : (
              <div className="space-y-3">
                {swapRequests.slice(0, 3).map(request => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-sm">
                        {request.requester_first_name} {request.requester_last_name} → {request.target_first_name} {request.target_last_name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge 
                      variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'}
                    >
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leave Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Leave Requests
              </span>
              <Link href="/team-lead/team">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaveRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No leave requests</p>
            ) : (
              <div className="space-y-3">
                {leaveRequests.slice(0, 3).map(request => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-sm">
                        {request.first_name} {request.last_name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {request.type} • {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge 
                      variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'}
                    >
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Members Status */}
      {teamMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Team Members</span>
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
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
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
