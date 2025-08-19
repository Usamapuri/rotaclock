"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthService } from "@/lib/auth"
import Link from "next/link"
import { Users, Building, TrendingUp, Settings, Plus } from "lucide-react"

type Team = { id: string; name: string; department?: string; project_id?: string }
type Project = { id: string; name: string; description?: string }

export default function PMDashboard() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState({ 
    members: 0, 
    online: 0, 
    break: 0, 
    totalTeams: 0,
    totalProjects: 0 
  })

  useEffect(() => {
    async function load() {
      const user = AuthService.getCurrentUser()
      if (!user?.id) return
      
      try {
        // Fetch teams by manager
        const teamsRes = await fetch(`/api/teams/by-manager?managerId=${user.id}`)
        const teamsData = await teamsRes.json()
        const t: Team[] = teamsData?.data || []
        setTeams(t)

        // Fetch projects
        const projectsRes = await fetch('/api/project-manager/projects', { 
          headers: { 'authorization': `Bearer ${user.id}` } 
        })
        const projectsData = await projectsRes.json()
        const p: Project[] = projectsData?.data || []
        setProjects(p)

        // Aggregate live stats from each team
        let members = 0, online = 0, onbreak = 0
        for (const team of t) {
          try {
            const liveRes = await fetch(`/api/teams/${team.id}/live-status`)
            const live = await liveRes.json()
            const s = live?.data?.stats || { total_members: 0, online: 0, on_break: 0 }
            members += s.total_members
            online += s.online
            onbreak += s.on_break
          } catch (error) {
            console.error(`Error fetching live status for team ${team.id}:`, error)
          }
        }

        setStats({ 
          members, 
          online, 
          break: onbreak, 
          totalTeams: t.length,
          totalProjects: p.length 
        })
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-5">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-40" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.members}</div>
            <p className="text-xs text-muted-foreground">
              Across {stats.totalTeams} teams
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.online}</div>
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
            <div className="text-2xl font-bold">{stats.break}</div>
            <p className="text-xs text-muted-foreground">
              Taking breaks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
            <p className="text-xs text-muted-foreground">
              Under management
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Active projects
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
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Link href="/project-manager/teams">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Manage Teams
              </Button>
            </Link>
            <Link href="/project-manager/live">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                Live Monitoring
              </Button>
            </Link>
            <Link href="/project-manager/performance">
              <Button variant="outline" className="w-full justify-start">
                <Building className="h-4 w-4 mr-2" />
                Performance Metrics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Teams */}
      {teams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your Teams</span>
              <Link href="/project-manager/teams">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {teams.slice(0, 6).map(team => (
                <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{team.name}</h4>
                    {team.department && (
                      <p className="text-sm text-muted-foreground">{team.department}</p>
                    )}
                  </div>
                  <Link href={`/project-manager/teams/${team.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


