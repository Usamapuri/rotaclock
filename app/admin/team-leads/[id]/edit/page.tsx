"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { AuthService } from "@/lib/auth"

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
}

interface Team { id: string; name: string }

export default function AdminTeamLeadEditPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [lead, setLead] = useState<TeamLead | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || !AuthService.isAdmin()) {
      router.push('/admin/login')
      return
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function load() {
    try {
      const [leadRes, teamsRes] = await Promise.all([
        fetch(`/api/admin/team-leads/${id}`),
        fetch('/api/admin/teams')
      ])
      if (leadRes.ok) {
        const data = await leadRes.json()
        setLead(data.data)
        setSelectedTeam(data.data?.team_id || "")
      }
      if (teamsRes.ok) {
        const data = await teamsRes.json()
        setTeams((data.data || []).map((t: any) => ({ id: t.id, name: t.name })))
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to load')
    }
  }

  async function reassign() {
    if (!selectedTeam) {
      toast.error('Select a team')
      return
    }
    try {
      setSaving(true)
      const res = await fetch(`/api/admin/teams/${selectedTeam}/assign-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_lead_id: id })
      })
      if (res.ok) {
        toast.success('Team lead reassigned')
        router.push(`/admin/team-leads/${id}`)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to reassign')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to reassign')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate() {
    if (!confirm('This will demote the team lead to employee and unassign them from teams. Continue?')) return
    try {
      setDeactivating(true)
      const res = await fetch(`/api/admin/team-leads/${id}/deactivate`, { method: 'POST' })
      if (res.ok) {
        toast.success('Team lead deactivated')
        router.push('/admin/team-leads')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to deactivate')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to deactivate')
    } finally {
      setDeactivating(false)
    }
  }

  if (!lead) return <div className="container mx-auto p-6">Loading…</div>

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Team Lead</CardTitle>
          <CardDescription>Reassign team or deactivate role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input value={lead.first_name} readOnly />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={lead.last_name} readOnly />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={lead.email} readOnly />
            </div>
            <div>
              <Label>Employee ID</Label>
              <Input value={lead.employee_id} readOnly />
            </div>
          </div>

          <div>
            <Label>Assign to Team</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push(`/admin/team-leads/${id}`)}>Cancel</Button>
            <Button onClick={reassign} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            <Button variant="destructive" onClick={deactivate} disabled={deactivating}>{deactivating ? 'Deactivating…' : 'Deactivate Lead'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
