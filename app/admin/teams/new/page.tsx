"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"

interface Employee {
	id: string
	first_name: string
	last_name: string
	email: string
	position: string
	department: string
}

export default function AdminCreateTeamPage() {
	const router = useRouter()
	const [employees, setEmployees] = useState<Employee[]>([])
	const [form, setForm] = useState({ name: "", department: "", team_lead_id: "", description: "" })
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		const user = AuthService.getCurrentUser()
		if (!user || !AuthService.isAdmin()) {
			router.push('/admin/login')
			return
		}
		loadEmployees()
	}, [router])

	const loadEmployees = async () => {
		try {
			const res = await fetch('/api/employees')
			if (res.ok) {
				const data = await res.json()
				setEmployees(data.data || [])
			}
		} catch (e) {
			console.error(e)
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!form.name || !form.department || !form.team_lead_id) {
			toast.error('Please fill required fields')
			return
		}
		try {
			setSubmitting(true)
			const res = await fetch('/api/admin/teams', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form)
			})
			if (res.ok) {
				toast.success('Team created')
				router.push('/admin/teams')
			} else {
				const err = await res.json()
				toast.error(err.error || 'Failed to create team')
			}
		} catch (e) {
			console.error(e)
			toast.error('Failed to create team')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="container mx-auto p-6">
			<Card className="max-w-2xl mx-auto">
				<CardHeader>
					<CardTitle>Create Team</CardTitle>
					<CardDescription>Define a new team and assign a team lead.</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="space-y-4" onSubmit={handleSubmit}>
						<div>
							<Label htmlFor="name">Team Name</Label>
							<Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
						</div>
						<div>
							<Label htmlFor="department">Department</Label>
							<Input id="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
						</div>
						<div>
							<Label htmlFor="lead">Team Lead</Label>
							<Select value={form.team_lead_id} onValueChange={(v) => setForm({ ...form, team_lead_id: v })}>
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
						<div>
							<Label htmlFor="description">Description (optional)</Label>
							<Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
						</div>
						<div className="flex gap-2 justify-end">
							<Button variant="outline" type="button" onClick={() => router.push('/admin/teams')}>Cancel</Button>
							<Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create Team'}</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
