"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Plus,
	Users,
	UserCheck,
	Search,
	Edit,
	Trash2,
	Eye,
	Award,
	Star,
} from "lucide-react"
import { useRouter } from "next/navigation"
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

interface Employee {
	id: string
	first_name: string
	last_name: string
	email: string
	position: string
	department: string
	employee_id: string
}

export default function AdminTeamLeadsPage() {
	const [teamLeads, setTeamLeads] = useState<TeamLead[]>([])
	const [employees, setEmployees] = useState<Employee[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
	const [showAssignDialog, setShowAssignDialog] = useState(false)
	const [selectedEmployee, setSelectedEmployee] = useState("")
	const [isAssigning, setIsAssigning] = useState(false)
	const router = useRouter()

	useEffect(() => {
		const user = AuthService.getCurrentUser()
		if (!user || !AuthService.isAdmin()) {
			router.push('/admin/login')
			return
		}
		loadTeamLeads()
		loadEmployees()
	}, [router])

	const loadTeamLeads = async () => {
		try {
			setIsLoading(true)
			const res = await fetch('/api/admin/team-leads')
			if (res.ok) {
				const data = await res.json()
				setTeamLeads(data.data || [])
			} else {
				toast.error('Failed to load team leads')
			}
		} catch (e) {
			console.error(e)
			toast.error('Failed to load team leads')
		} finally {
			setIsLoading(false)
		}
	}

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

	const handleAssignTeamLead = async () => {
		if (!selectedEmployee) {
			toast.error('Please select an employee')
			return
		}
		try {
			setIsAssigning(true)
			const res = await fetch('/api/admin/team-leads/assign', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ employee_id: selectedEmployee })
			})
			if (res.ok) {
				toast.success('Team lead role assigned')
				setShowAssignDialog(false)
				setSelectedEmployee("")
				loadTeamLeads()
			} else {
				const err = await res.json()
				toast.error(err.error || 'Failed to assign role')
			}
		} catch (e) {
			console.error(e)
			toast.error('Failed to assign role')
		} finally {
			setIsAssigning(false)
		}
	}

	const filtered = teamLeads.filter(tl => {
		const s = searchTerm.toLowerCase()
		const matchesSearch =
			`${tl.first_name} ${tl.last_name}`.toLowerCase().includes(s) ||
			tl.email.toLowerCase().includes(s) ||
			tl.employee_id.toLowerCase().includes(s) ||
			(tl.team_name || '').toLowerCase().includes(s)
    const matchesDept = departmentFilter === 'all' || tl.department === departmentFilter
		return matchesSearch && matchesDept
	})

	const departments = [...new Set(teamLeads.map(tl => tl.department).filter(Boolean))]

	const stats = {
		total: teamLeads.length,
		active: teamLeads.filter(t => t.is_active).length,
		members: teamLeads.reduce((sum, t) => sum + (t.member_count || 0), 0),
		avgPerf: teamLeads.length > 0 ? Math.round((teamLeads.reduce((s, t) => s + (t.performance_score || 0), 0) / teamLeads.length) * 10) / 10 : 0
	}

	return (
		<div className="container mx-auto p-6">
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-3xl font-bold">Team Lead Management</h1>
					<p className="text-gray-600">Manage team leads and their performance</p>
				</div>
				<Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="h-4 w-4 mr-2" /> Assign Team Lead
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Assign Team Lead Role</DialogTitle>
							<DialogDescription>Select an employee to assign the team lead role.</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<Label htmlFor="employee">Select Employee</Label>
								<Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
									<SelectTrigger>
										<SelectValue placeholder="Choose an employee" />
									</SelectTrigger>
									<SelectContent>
										{employees
											.filter(emp => !teamLeads.some(tl => tl.id === emp.id))
											.map(emp => (
												<SelectItem key={emp.id} value={emp.id}>
													{emp.first_name} {emp.last_name} - {emp.position} ({emp.department})
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
							<Button onClick={handleAssignTeamLead} disabled={isAssigning}>{isAssigning ? 'Assigning…' : 'Assign Role'}</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Team Leads</CardTitle>
						<Award className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Active Team Leads</CardTitle>
						<UserCheck className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.active}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Team Members</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.members}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
						<Star className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.avgPerf}/5</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Team Leads</CardTitle>
					<CardDescription>Manage team leads and their performance</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col md:flex-row gap-4 mb-4">
						<div className="flex-1">
							<Label htmlFor="search">Search</Label>
							<div className="relative">
								<Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
								<Input id="search" placeholder="Search team leads, teams, or departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
							</div>
						</div>
						<div className="w-full md:w-48">
              <Label htmlFor="department">Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
								<SelectTrigger>
									<SelectValue placeholder="All departments" />
								</SelectTrigger>
								<SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
									{departments.map(d => (
										<SelectItem key={d} value={d}>{d}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Team Lead</TableHead>
									<TableHead>Employee ID</TableHead>
									<TableHead>Department</TableHead>
									<TableHead>Team</TableHead>
									<TableHead>Members</TableHead>
									<TableHead>Performance</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading ? (
									<TableRow><TableCell colSpan={7} className="text-center py-8">Loading…</TableCell></TableRow>
								) : filtered.length === 0 ? (
									<TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No team leads found.</TableCell></TableRow>
								) : (
									filtered.map(tl => (
										<TableRow key={tl.id}>
											<TableCell>
												<div>
													<div className="font-medium">{tl.first_name} {tl.last_name}</div>
													<div className="text-sm text-gray-500">{tl.email}</div>
												</div>
											</TableCell>
											<TableCell>{tl.employee_id}</TableCell>
											<TableCell>{tl.department}</TableCell>
											<TableCell>{tl.team_name ? <Badge variant="outline">{tl.team_name}</Badge> : <span className="text-gray-500">Unassigned</span>}</TableCell>
											<TableCell><Badge variant="secondary">{tl.member_count} members</Badge></TableCell>
											<TableCell>{tl.performance_score ? `${tl.performance_score}/5` : 'N/A'}</TableCell>
											<TableCell><Badge variant={tl.is_active ? 'default' : 'secondary'}>{tl.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
