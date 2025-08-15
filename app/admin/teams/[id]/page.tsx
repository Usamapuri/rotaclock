"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { AuthService } from "@/lib/auth"

interface Team {
	id: string
	name: string
	department: string
	description: string | null
	team_lead_id: string | null
	team_lead_first_name?: string
	team_lead_last_name?: string
	team_lead_email?: string
	member_count: number
	is_active: boolean
}

interface Employee { id: string; first_name: string; last_name: string; position: string; department: string }
interface Member { id: string; first_name: string; last_name: string; email: string; employee_id: string }

export default function AdminTeamDetailPage() {
	const params = useParams()
	const teamId = params.id as string
	const router = useRouter()
	const [team, setTeam] = useState<Team | null>(null)
	const [employees, setEmployees] = useState<Employee[]>([])
	const [members, setMembers] = useState<Member[]>([])
	const [saving, setSaving] = useState(false)
	const [selectedLeadId, setSelectedLeadId] = useState<string>("")
	const [reassigning, setReassigning] = useState(false)

	useEffect(() => {
		const user = AuthService.getCurrentUser()
		if (!user || !AuthService.isAdmin()) {
			router.push('/admin/login')
			return
		}
		load()
	}, [router, teamId])

	async function load() {
		try {
			const [teamRes, empRes, memRes] = await Promise.all([
				fetch(`/api/admin/teams/${teamId}`),
				fetch('/api/employees'),
				fetch(`/api/admin/teams/${teamId}/members`),
			])
			if (teamRes.ok) {
				const data = await teamRes.json()
				setTeam(data.data)
				setSelectedLeadId(data.data?.team_lead_id ?? "")
			}
			if (empRes.ok) {
				const data = await empRes.json()
				setEmployees(data.data || [])
			}
			if (memRes.ok) {
				const data = await memRes.json()
				setMembers(data.data || [])
			}
		} catch (e) {
			console.error(e)
			toast.error('Failed to load team')
		}
	}

	async function reassignLead() {
		if (!team) return
		if (!selectedLeadId) {
			toast.error('Select a team lead')
			return
		}
		try {
			setReassigning(true)
			const res = await fetch(`/api/admin/teams/${team.id}/assign-lead`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ team_lead_id: selectedLeadId })
			})
			if (res.ok) {
				toast.success('Team lead reassigned')
				load()
			} else {
				const err = await res.json()
				toast.error(err.error || 'Failed to reassign')
			}
		} catch (e) {
			console.error(e)
			toast.error('Failed to reassign')
		} finally {
			setReassigning(false)
		}
	}

	async function save() {
		if (!team) return
		try {
			setSaving(true)
			const res = await fetch(`/api/admin/teams/${team.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: team.name,
					department: team.department,
					description: team.description,
					team_lead_id: team.team_lead_id,
					is_active: team.is_active,
				})
			})
			if (res.ok) {
				toast.success('Team updated')
				load()
			} else {
				const err = await res.json()
				toast.error(err.error || 'Failed to update team')
			}
		} catch (e) {
			console.error(e)
			toast.error('Failed to update team')
		} finally {
			setSaving(false)
		}
	}

	if (!team) {
		return <div className="container mx-auto p-6">Loading…</div>
	}

	return (
		<div className="container mx-auto p-6 space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Edit Team</CardTitle>
					<CardDescription>Update team details and lead.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<Label htmlFor="name">Team Name</Label>
						<Input id="name" value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} />
					</div>
					<div>
						<Label htmlFor="department">Department</Label>
						<Input id="department" value={team.department} onChange={(e) => setTeam({ ...team, department: e.target.value })} />
					</div>
					<div>
						<Label htmlFor="lead">Team Lead</Label>
						<Select value={team.team_lead_id ?? ''} onValueChange={(v) => setTeam({ ...team, team_lead_id: v })}>
							<SelectTrigger>
								<SelectValue placeholder="Select team lead" />
							</SelectTrigger>
							<SelectContent>
								{employees.map(e => (
									<SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} - {e.position}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="mt-2">
						<Label>Quick Reassign Team Lead</Label>
						<div className="flex gap-2 items-center">
							<Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
								<SelectTrigger>
									<SelectValue placeholder="Select team lead" />
								</SelectTrigger>
								<SelectContent>
									{employees.map(e => (
										<SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} - {e.position}</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button onClick={reassignLead} disabled={reassigning}>{reassigning ? 'Reassigning…' : 'Assign'}</Button>
						</div>
					</div>
					<div>
						<Label htmlFor="description">Description</Label>
						<Input id="description" value={team.description ?? ''} onChange={(e) => setTeam({ ...team, description: e.target.value })} />
					</div>
					<div className="flex gap-2 justify-end">
						<Button variant="outline" onClick={() => router.push('/admin/teams')}>Back</Button>
						<Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Team Members</CardTitle>
					<CardDescription>Active members assigned to this team</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-2">
						{members.length === 0 ? (
							<div className="text-gray-500">No members in this team.</div>
						) : (
							<div className="grid md:grid-cols-2 gap-3">
								{members.map(m => (
									<div key={m.id} className="border rounded p-3">
										<div className="font-medium">{m.first_name} {m.last_name}</div>
										<div className="text-sm text-gray-500">{m.email} · {m.employee_id}</div>
										<Badge variant="secondary">Member</Badge>
									</div>
								))}
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
