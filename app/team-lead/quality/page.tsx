"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function TeamLeadQualityPage() {
  const router = useRouter()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0,10))
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ employee_id: '', call_id: '', score: '', feedback: '' })

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
        await load(team.id, startDate, endDate)
      } catch (e: any) {
        setError(e.message || 'Error')
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function load(team: string, s: string, e: string) {
    try {
      setLoading(true)
      setError(null)
      const url = new URL(window.location.origin + '/api/quality-scores')
      url.searchParams.set('team_id', team)
      url.searchParams.set('start_date', s)
      url.searchParams.set('end_date', e)
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Failed to load quality scores')
      const json = await res.json()
      setScores(json.data || [])
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function createScore() {
    if (!form.employee_id || !form.score) return
    try {
      const res = await fetch('/api/quality-scores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, score: Number(form.score) })
      })
      if (!res.ok) throw new Error('Failed to create score')
      setForm({ employee_id: '', call_id: '', score: '', feedback: '' })
      if (teamId) await load(teamId, startDate, endDate)
    } catch (e: any) {
      alert(e.message || 'Error')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Quality Reviews</CardTitle></CardHeader>
        <CardContent>
          {!teamId ? 'No team assigned.' : (
            <div className="space-y-4">
              <div className="flex gap-2 items-end">
                <div>
                  <label className="text-xs text-gray-600">Start Date</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">End Date</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <Button variant="outline" onClick={() => teamId && load(teamId, startDate, endDate)}>Apply</Button>
              </div>
              {loading ? 'Loading…' : error ? <div className="text-red-600 text-sm">{error}</div> : (
                <ul className="divide-y rounded border">
                  {scores.map(s => (
                    <li key={s.id} className="px-3 py-2 text-sm flex justify-between">
                      <span>{s.first_name} {s.last_name} — Score: <strong>{s.score}</strong></span>
                      <span className="text-gray-500">{s.evaluation_date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>New Quality Score</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-600">Employee ID</label>
              <Input value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} placeholder="UUID" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Call ID</label>
              <Input value={form.call_id} onChange={e => setForm({ ...form, call_id: e.target.value })} placeholder="#" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Score</label>
              <Input value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} placeholder="0-5" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Feedback</label>
              <Input value={form.feedback} onChange={e => setForm({ ...form, feedback: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={createScore}>Create</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
