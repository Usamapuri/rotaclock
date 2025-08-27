"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, TrendingUp, Star, Activity, ArrowLeft } from "lucide-react"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"

interface TeamLead {
  id: string
  first_name: string
  last_name: string
  email: string
  employee_id: string
  department: string
  position: string
  team_id: string | null
  team_name: string | null
  member_count: number
  is_active: boolean
  hire_date: string
  performance_score: number | null
  quality_score: number | null
}

export default function AdminTeamLeadDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [lead, setLead] = useState<TeamLead | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || !AuthService.isAdmin()) {
      router.push('/login')
      return
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function load() {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/team-leads/${id}`)
      if (res.ok) {
        const data = await res.json()
        setLead(data.data)
      } else {
        toast.error('Failed to load team lead')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to load team lead')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="container mx-auto p-6">Loading…</div>
  if (!lead) return <div className="container mx-auto p-6 text-red-500">Not found</div>

  const stats = {
    members: lead.member_count || 0,
    perf: lead.performance_score ? Math.round(lead.performance_score * 10) / 10 : 0,
    quality: lead.quality_score ? Math.round(lead.quality_score * 10) / 10 : 0,
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/team-leads')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{lead.first_name} {lead.last_name}</h1>
            <p className="text-sm text-gray-600">Team Lead · {lead.department}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.members}</div>
            <p className="text-xs text-muted-foreground">in {lead.team_name || 'No team'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.perf}/5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quality}/5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={lead.is_active ? 'default' : 'secondary'}>{lead.is_active ? 'Active' : 'Inactive'}</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
