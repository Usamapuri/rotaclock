"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function TeamLeadCommunicationsPage() {
  const router = useRouter()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [info, setInfo] = useState<{quality: any[]; training: any[]}>({ quality: [], training: [] })

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'team_lead') {
      router.replace('/login')
      return
    }
    ;(async () => {
      const byLead = await fetch(`/api/teams/by-lead?leadId=${user.id}`)
      const { data } = await byLead.json()
      const team = (data || [])[0]
      if (!team) { setTeamId(null); return }
      setTeamId(team.id)
      const [qsRes, trRes] = await Promise.all([
        fetch(`/api/quality-scores?team_id=${team.id}`),
        fetch(`/api/teams/${team.id}/training-assignments`)
      ])
      const [qs, tr] = await Promise.all([qsRes.json(), trRes.json()])
      setInfo({ quality: (qs.data || []).slice(0,5), training: (tr.data || []).slice(0,5) })
    })()
  }, [router])

  async function broadcastToTeam() {
    if (!teamId || !message.trim()) return
    try {
      setSending(true)
      // resolve team member ids
      const membersRes = await fetch(`/api/teams/${teamId}/members`)
      const membersJson = await membersRes.json()
      const employeeIds = (membersJson.data || []).map((m: any) => m.id)

      const res = await fetch('/api/notifications/broadcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, employeeIds })
      })
      if (!res.ok) throw new Error('Failed to send broadcast')
      setMessage("")
    } catch (e: any) {
      alert(e.message || 'Error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Team Broadcast</CardTitle></CardHeader>
        <CardContent>
          {!teamId ? 'No team assigned.' : (
            <div className="flex gap-2">
              <Input placeholder="Type a message to your team…" value={message} onChange={e => setMessage(e.target.value)} />
              <Button onClick={broadcastToTeam} disabled={sending || !message.trim()}>Send</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Recent Quality Reviews</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm divide-y">
              {info.quality.map((q: any) => (
                <li key={q.id} className="py-2 flex justify-between">
                  <span>{q.first_name} {q.last_name} · Score {q.score}</span>
                  <span className="text-gray-500">{q.evaluation_date}</span>
                </li>
              ))}
              {info.quality.length === 0 && <li className="py-2 text-gray-500">No recent items</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Training Assignments</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm divide-y">
              {info.training.map((t: any) => (
                <li key={t.id} className="py-2 flex justify-between">
                  <span>{t.first_name} {t.last_name} · {t.training_title}</span>
                  <span className="text-gray-500">{t.status}</span>
                </li>
              ))}
              {info.training.length === 0 && <li className="py-2 text-gray-500">No recent items</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
