"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthService } from "@/lib/auth"
import { Button } from "@/components/ui/button"

type Team = { id: string; name: string; project_id?: string | null }
type Assignment = { id: string; date: string; start_time?: string; end_time?: string; employee?: { first_name: string; last_name: string } }
type EmployeeOption = { id: string; first_name: string; last_name: string }
type ShiftOption = { id: string; name: string }

export default function PMSchedulingPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | ''>('')
  const [start, setStart] = useState<string>(new Date().toISOString().split('T')[0])
  const [end, setEnd] = useState<string>(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [employeeId, setEmployeeId] = useState<string>("")
  const [shiftId, setShiftId] = useState<string>("")
  const [teamMembers, setTeamMembers] = useState<EmployeeOption[]>([])
  const [shifts, setShifts] = useState<ShiftOption[]>([])
  const [newShift, setNewShift] = useState({ name: '', start_time: '', end_time: '' })

  useEffect(() => {
    async function init() {
      const user = AuthService.getCurrentUser()
      if (!user?.id) return
      const teamsRes = await fetch(`/api/teams/by-manager?managerId=${user.id}`)
      const t = await teamsRes.json()
      setTeams(t?.data || [])
      if (t?.data?.[0]?.id) setSelectedTeamId(t.data[0].id)
      const shiftsRes = await fetch('/api/shifts?is_active=true')
      const shiftsData = await shiftsRes.json()
      setShifts((shiftsData?.data || []).map((s: any) => ({ id: s.id, name: s.name })))
    }
    init()
  }, [])

  useEffect(() => {
    async function load() {
      if (!selectedTeamId) return
      const r = await fetch(`/api/shifts/assignments?start_date=${start}&end_date=${end}`)
      const d = await r.json()
      setAssignments(d?.data || [])
      const m = await fetch(`/api/teams/${selectedTeamId}/members`)
      const md = await m.json()
      setTeamMembers((md?.data || []).map((e: any) => ({ id: e.id, first_name: e.first_name, last_name: e.last_name })))
    }
    load()
  }, [selectedTeamId, start, end])

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <select className="border rounded px-3 py-2" value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="date" className="border rounded px-2 py-1" value={start} onChange={e => setStart(e.target.value)} />
        <input type="date" className="border rounded px-2 py-1" value={end} onChange={e => setEnd(e.target.value)} />
      </div>
      <Card>
        <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {assignments.map(a => (
              <div key={a.id} className="flex items-center justify-between border rounded px-3 py-2">
                <div className="text-sm">{a.date} {a.start_time || ''}-{a.end_time || ''}</div>
                <div className="text-sm text-muted-foreground">{a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : ''}</div>
              </div>
            ))}
            {assignments.length === 0 && <div className="text-sm text-muted-foreground">No assignments in range.</div>}
          </div>
          <div className="mt-6 grid gap-2">
            <div className="text-sm font-medium">Create Assignment (PM)</div>
            <select className="border rounded px-2 py-1" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
              <option value="">Select Employee</option>
              {teamMembers.map(e => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
            <select className="border rounded px-2 py-1" value={shiftId} onChange={e => setShiftId(e.target.value)}>
              <option value="">Select Shift</option>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input type="date" className="border rounded px-2 py-1" value={start} onChange={e => setStart(e.target.value)} />
              <input className="border rounded px-2 py-1" placeholder="Start time (HH:MM)" onChange={e => {/* optional */}} />
            </div>
            <Button onClick={async () => {
              const user = AuthService.getCurrentUser()
              const res = await fetch('/api/project-manager/shifts/assignments', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'authorization': `Bearer ${user?.id || ''}`
                },
                body: JSON.stringify({ employee_id: employeeId, shift_id: shiftId, date: start })
              })
              if (res.ok) {
                alert('Assignment created')
              } else {
                const e = await res.json().catch(()=>({}))
                alert('Failed: ' + (e?.error || res.status))
              }
            }}>Create</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Manage Shifts</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="font-medium text-sm">Create New Shift</div>
          <input className="border rounded px-2 py-1" placeholder="Name" value={newShift.name} onChange={e => setNewShift(s => ({ ...s, name: e.target.value }))} />
          <div className="flex gap-2">
            <input className="border rounded px-2 py-1" placeholder="Start (HH:MM)" value={newShift.start_time} onChange={e => setNewShift(s => ({ ...s, start_time: e.target.value }))} />
            <input className="border rounded px-2 py-1" placeholder="End (HH:MM)" value={newShift.end_time} onChange={e => setNewShift(s => ({ ...s, end_time: e.target.value }))} />
          </div>
          <Button onClick={async () => {
            const user = AuthService.getCurrentUser()
            const res = await fetch('/api/shifts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${user?.id || ''}` },
              body: JSON.stringify({ name: newShift.name, start_time: newShift.start_time, end_time: newShift.end_time, required_staff: 1, color: '#3B82F6' })
            })
            if (res.ok) {
              alert('Shift created')
              const shiftsRes = await fetch('/api/shifts?is_active=true')
              const shiftsData = await shiftsRes.json()
              setShifts((shiftsData?.data || []).map((s: any) => ({ id: s.id, name: s.name })))
            } else {
              const e = await res.json().catch(()=>({}))
              alert('Failed: ' + (e?.error || res.status))
            }
          }}>Create Shift</Button>

          <div className="mt-4 font-medium text-sm">Edit Existing Shift</div>
          <select className="border rounded px-2 py-1" value={shiftId} onChange={e => setShiftId(e.target.value)}>
            <option value="">Select Shift</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {shiftId && (
            <div className="flex gap-2 items-center">
              <input className="border rounded px-2 py-1" placeholder="New Name" onChange={e => setNewShift(s => ({ ...s, name: e.target.value }))} />
              <Button onClick={async () => {
                const user = AuthService.getCurrentUser()
                const res = await fetch('/api/shifts', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${user?.id || ''}` },
                  body: JSON.stringify({ id: shiftId, name: newShift.name })
                })
                if (res.ok) {
                  alert('Shift updated')
                  const shiftsRes = await fetch('/api/shifts?is_active=true')
                  const shiftsData = await shiftsRes.json()
                  setShifts((shiftsData?.data || []).map((s: any) => ({ id: s.id, name: s.name })))
                } else {
                  const e = await res.json().catch(()=>({}))
                  alert('Failed: ' + (e?.error || res.status))
                }
              }}>Save</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


