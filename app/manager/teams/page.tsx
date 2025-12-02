"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Users,
    Plus,
    Search,
    RefreshCw,
    MoreVertical,
    Trash2,
    Edit,
    UserPlus
} from "lucide-react"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Team {
    id: string
    name: string
    description?: string
    department?: string
    member_count: number
    lead_first_name?: string
    lead_last_name?: string
}

interface Employee {
    id: string
    first_name: string
    last_name: string
    email: string
}

export default function ManagerTeams() {
    const router = useRouter()
    const [teams, setTeams] = useState<Team[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Create/Edit Modal State
    const [showTeamModal, setShowTeamModal] = useState(false)
    const [editingTeam, setEditingTeam] = useState<Team | null>(null)
    const [teamForm, setTeamForm] = useState({ name: '', description: '', department: '' })

    // Manage Members Modal State
    const [showMembersModal, setShowMembersModal] = useState(false)
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
    const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([])
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

    useEffect(() => {
        const user = AuthService.getCurrentUser()
        if (!user || user.role !== 'manager') {
            router.push('/login')
            return
        }
        loadTeams()
    }, [router])

    const loadTeams = async () => {
        try {
            setIsLoading(true)
            const user = AuthService.getCurrentUser()
            const headers = user?.id ? { authorization: `Bearer ${user.id}` } : {}

            const response = await fetch('/api/manager/teams', { headers })
            if (!response.ok) throw new Error('Failed to load teams')

            const data = await response.json()
            setTeams(data.data || [])
        } catch (error) {
            console.error('Error loading teams:', error)
            toast.error('Failed to load teams')
        } finally {
            setIsLoading(false)
        }
    }

    const loadEmployees = async () => {
        try {
            const user = AuthService.getCurrentUser()
            const headers = user?.id ? { authorization: `Bearer ${user.id}` } : {}

            // We can reuse the manager employees API
            const response = await fetch('/api/manager/employees', { headers })
            if (response.ok) {
                const data = await response.json()
                setAvailableEmployees(data.data.employees || [])
            }
        } catch (error) {
            console.error('Error loading employees:', error)
        }
    }

    const handleCreateTeam = () => {
        setEditingTeam(null)
        setTeamForm({ name: '', description: '', department: '' })
        setShowTeamModal(true)
    }

    const handleEditTeam = (team: Team) => {
        setEditingTeam(team)
        setTeamForm({
            name: team.name,
            description: team.description || '',
            department: team.department || ''
        })
        setShowTeamModal(true)
    }

    const handleSaveTeam = async () => {
        try {
            const user = AuthService.getCurrentUser()
            const headers = {
                'Content-Type': 'application/json',
                ...(user?.id ? { authorization: `Bearer ${user.id}` } : {})
            }

            const url = editingTeam
                ? `/api/manager/teams/${editingTeam.id}`
                : '/api/manager/teams'

            const method = editingTeam ? 'PATCH' : 'POST'

            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(teamForm)
            })

            if (!response.ok) throw new Error('Failed to save team')

            toast.success(editingTeam ? 'Team updated' : 'Team created')
            setShowTeamModal(false)
            loadTeams()
        } catch (error) {
            console.error('Error saving team:', error)
            toast.error('Failed to save team')
        }
    }

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm('Are you sure you want to delete this team?')) return

        try {
            const user = AuthService.getCurrentUser()
            const headers = user?.id ? { authorization: `Bearer ${user.id}` } : {}

            const response = await fetch(`/api/manager/teams/${teamId}`, {
                method: 'DELETE',
                headers
            })

            if (!response.ok) throw new Error('Failed to delete team')

            toast.success('Team deleted')
            loadTeams()
        } catch (error) {
            console.error('Error deleting team:', error)
            toast.error('Failed to delete team')
        }
    }

    const handleManageMembers = async (teamId: string) => {
        setSelectedTeamId(teamId)
        await loadEmployees()
        setShowMembersModal(true)
    }

    const handleAddMember = async () => {
        if (!selectedTeamId || !selectedEmployeeId) return

        try {
            const user = AuthService.getCurrentUser()
            const headers = {
                'Content-Type': 'application/json',
                ...(user?.id ? { authorization: `Bearer ${user.id}` } : {})
            }

            const response = await fetch(`/api/manager/teams/${selectedTeamId}/members`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ employee_id: selectedEmployeeId })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to add member')
            }

            toast.success('Member added to team')
            setSelectedEmployeeId('')
            loadTeams() // Refresh counts
        } catch (error: any) {
            console.error('Error adding member:', error)
            toast.error(error.message || 'Failed to add member')
        }
    }

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
                        <p className="text-gray-600 mt-1">Manage your teams and assignments</p>
                    </div>
                    <Button onClick={handleCreateTeam}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Team
                    </Button>
                </div>

                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search teams..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 max-w-md"
                    />
                </div>

                {/* Teams Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map((team) => (
                        <Card key={team.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="space-y-1">
                                    <CardTitle>{team.name}</CardTitle>
                                    <CardDescription>{team.department || 'No Department'}</CardDescription>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEditTeam(team)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleManageMembers(team.id)}>
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Manage Members
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTeam(team.id)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Team
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500 line-clamp-2">
                                        {team.description || 'No description provided.'}
                                    </p>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center text-gray-600">
                                            <Users className="h-4 w-4 mr-1" />
                                            {team.member_count} members
                                        </div>
                                        {team.lead_first_name && (
                                            <Badge variant="outline">
                                                Lead: {team.lead_first_name} {team.lead_last_name}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {filteredTeams.length === 0 && !isLoading && (
                    <div className="text-center py-12">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No teams found</h3>
                        <p className="text-gray-500 mt-1">Get started by creating a new team.</p>
                    </div>
                )}

                {/* Create/Edit Team Modal */}
                <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create Team'}</DialogTitle>
                            <DialogDescription>
                                {editingTeam ? 'Update team details.' : 'Add a new team to your location.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Team Name</Label>
                                <Input
                                    id="name"
                                    value={teamForm.name}
                                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                                    placeholder="e.g. Sales Team A"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Input
                                    id="department"
                                    value={teamForm.department}
                                    onChange={(e) => setTeamForm({ ...teamForm, department: e.target.value })}
                                    placeholder="e.g. Sales"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={teamForm.description}
                                    onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                                    placeholder="Describe the team's purpose..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowTeamModal(false)}>Cancel</Button>
                            <Button onClick={handleSaveTeam}>Save Team</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Manage Members Modal */}
                <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Manage Team Members</DialogTitle>
                            <DialogDescription>
                                Add members to this team.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex gap-2">
                                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select employee to add..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableEmployees.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.first_name} {emp.last_name} ({emp.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleAddMember} disabled={!selectedEmployeeId}>
                                    Add
                                </Button>
                            </div>
                            <p className="text-sm text-gray-500">
                                Note: Adding a member here will set their primary team to this team.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setShowMembersModal(false)}>Done</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
