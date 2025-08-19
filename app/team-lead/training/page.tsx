"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function TeamLeadTrainingPage() {
  const router = useRouter()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ employee_id: '', training_type: '', training_title: '', due_date: '' })

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
        if (!team) { setTeamId(null); setLoading(false); return }
        setTeamId(team.id)
        await load(team.id)
      } catch (e: any) {
        setError(e.message || 'Error')
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function load(team: string) {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/teams/${team}/training-assignments`)
      if (!res.ok) throw new Error('Failed to load training')
      const json = await res.json()
      setAssignments(json.data || [])
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function createAssignment() {
    if (!teamId || !form.employee_id || !form.training_type || !form.training_title) return
    try {
      const res = await fetch(`/api/teams/${teamId}/training-assignments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Failed to create assignment')
      setForm({ employee_id: '', training_type: '', training_title: '', due_date: '' })
      await load(teamId)
    } catch (e: any) {
      alert(e.message || 'Error')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Training Assignments</CardTitle></CardHeader>
        <CardContent>
          {!teamId ? 'No team assigned.' : loading ? 'Loading…' : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : (
            <ul className="divide-y rounded border">
              {assignments.map(a => (
                <li key={a.id} className="px-3 py-2 text-sm flex justify-between">
                  <span>{a.first_name} {a.last_name} — {a.training_title} ({a.training_type})</span>
                  <span className="text-gray-500">{a.status}{a.due_date ? ` · due ${a.due_date}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>New Training Assignment</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-600">Employee ID</label>
              <Input value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} placeholder="UUID" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Type</label>
              <Input value={form.training_type} onChange={e => setForm({ ...form, training_type: e.target.value })} placeholder="e.g. QA" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Title</label>
              <Input value={form.training_title} onChange={e => setForm({ ...form, training_title: e.target.value })} placeholder="Course title" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Due Date</label>
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div className="mt-3"><Button onClick={createAssignment}>Create</Button></div>
        </CardContent>
      </Card>
    </div>
  )
}
