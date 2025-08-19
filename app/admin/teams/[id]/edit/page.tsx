"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Save,
  ArrowLeft,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"

interface Team {
  id: string
  name: string
  description?: string
  department: string
  team_lead_id: string
  team_lead_first_name: string
  team_lead_last_name: string
  team_lead_email: string
  member_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  position: string
  department: string
  employee_id: string
  is_active: boolean
  team_id?: string
}

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  position: string
  employee_id: string
  joined_date: string
  role: string
}

export default function EditTeamPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string
  
  const [team, setTeam] = useState<Team | null>(null)
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form states
  const [teamData, setTeamData] = useState({
    name: "",
    description: "",
    department: "",
    team_lead_id: "",
    is_active: true
  })
  
  // Dialog states
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false)
  const [showChangeLeadDialog, setShowChangeLeadDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [newTeamLead, setNewTeamLead] = useState("")

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || !AuthService.isAdmin()) {
      router.push('/admin/login')
      return
    }
    
    loadTeamData()
  }, [teamId, router])

  const loadTeamData = async () => {
    try {
      setIsLoading(true)
      const user = AuthService.getCurrentUser()
      
      // Load team details
      const teamRes = await fetch(`/api/admin/teams/${teamId}`, {
        headers: { 'authorization': `Bearer ${user?.id || ''}` }
      })
      const teamData = await teamRes.json()
      
      // Load team members
      const membersRes = await fetch(`/api/admin/teams/${teamId}/members`, {
        headers: { 'authorization': `Bearer ${user?.id || ''}` }
      })
      const membersData = await membersRes.json()
      
      // Load available employees (not in any team)
      const employeesRes = await fetch('/api/employees', {
        headers: { 'authorization': `Bearer ${user?.id || ''}` }
      })
      const employeesData = await employeesRes.json()
      
      setTeam(teamData.data)
      setTeamMembers(membersData.data || [])
      setAvailableEmployees(employeesData.data?.filter((emp: Employee) => !emp.team_id) || [])
      
      // Set form data
      setTeamData({
        name: teamData.data.name,
        description: teamData.data.description || "",
        department: teamData.data.department,
        team_lead_id: teamData.data.team_lead_id,
        is_active: teamData.data.is_active
      })
    } catch (error) {
      console.error('Error loading team data:', error)
      toast.error('Failed to load team data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveTeam = async () => {
    try {
      setIsSaving(true)
      const user = AuthService.getCurrentUser()
      
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify(teamData)
      })

      if (res.ok) {
        toast.success('Team updated successfully')
        loadTeamData() // Reload data
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update team')
      }
    } catch (error) {
      console.error('Error updating team:', error)
      toast.error('Failed to update team')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedEmployee) return
    
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch(`/api/admin/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({ employee_id: selectedEmployee })
      })

      if (res.ok) {
        toast.success('Team member added successfully')
        setShowAddMemberDialog(false)
        setSelectedEmployee("")
        loadTeamData() // Reload data
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add team member')
      }
    } catch (error) {
      console.error('Error adding team member:', error)
      toast.error('Failed to add team member')
    }
  }

  const handleRemoveMember = async () => {
    if (!selectedMember) return
    
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch(`/api/admin/teams/${teamId}/members/${selectedMember.id}`, {
        method: 'DELETE',
        headers: { 'authorization': `Bearer ${user?.id || ''}` }
      })

      if (res.ok) {
        toast.success('Team member removed successfully')
        setShowRemoveMemberDialog(false)
        setSelectedMember(null)
        loadTeamData() // Reload data
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to remove team member')
      }
    } catch (error) {
      console.error('Error removing team member:', error)
      toast.error('Failed to remove team member')
    }
  }

  const handleChangeTeamLead = async () => {
    if (!newTeamLead) return
    
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch(`/api/admin/teams/${teamId}/change-lead`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({ new_team_lead_id: newTeamLead })
      })

      if (res.ok) {
        toast.success('Team lead changed successfully')
        setShowChangeLeadDialog(false)
        setNewTeamLead("")
        loadTeamData() // Reload data
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to change team lead')
      }
    } catch (error) {
      console.error('Error changing team lead:', error)
      toast.error('Failed to change team lead')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading team data...</div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Team not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Team: {team.name}</h1>
            <p className="text-gray-600">Manage team details, members, and settings</p>
          </div>
        </div>
        <Button onClick={handleSaveTeam} disabled={isSaving} className="flex items-center space-x-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Edit className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    value={teamData.name}
                    onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
                    placeholder="Enter team name"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={teamData.department}
                    onChange={(e) => setTeamData({ ...teamData, department: e.target.value })}
                    placeholder="Enter department"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={teamData.description}
                  onChange={(e) => setTeamData({ ...teamData, description: e.target.value })}
                  placeholder="Enter team description"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={teamData.is_active}
                  onCheckedChange={(checked) => setTeamData({ ...teamData, is_active: checked })}
                />
                <Label htmlFor="is_active">Team is active</Label>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Team Members ({teamMembers.length})</span>
                </CardTitle>
                <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center space-x-2">
                      <UserPlus className="h-4 w-4" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Team Member</DialogTitle>
                      <DialogDescription>
                        Select an employee to add to this team
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="employee">Select Employee</Label>
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableEmployees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.first_name} {employee.last_name} ({employee.employee_id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddMember} disabled={!selectedEmployee}>
                        Add Member
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No team members yet</p>
                  <p className="text-sm">Add members to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{member.first_name} {member.last_name}</div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{member.position}</TableCell>
                        <TableCell>{member.employee_id}</TableCell>
                        <TableCell>{new Date(member.joined_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMember(member)
                              setShowRemoveMemberDialog(true)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Team Lead */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5" />
                <span>Team Lead</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">
                  {team.team_lead_first_name} {team.team_lead_last_name}
                </div>
                <div className="text-sm text-gray-500">{team.team_lead_email}</div>
              </div>
              <Dialog open={showChangeLeadDialog} onOpenChange={setShowChangeLeadDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Change Team Lead
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Team Lead</DialogTitle>
                    <DialogDescription>
                      Select a new team lead for this team
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-lead">Select New Team Lead</Label>
                      <Select value={newTeamLead} onValueChange={setNewTeamLead}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a team lead" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableEmployees
                            .filter(emp => emp.position.toLowerCase().includes('lead') || emp.position.toLowerCase().includes('manager'))
                            .map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.first_name} {employee.last_name} ({employee.position})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowChangeLeadDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleChangeTeamLead} disabled={!newTeamLead}>
                      Change Lead
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Team Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Team Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Members</span>
                <Badge variant="secondary">{team.member_count}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant={team.is_active ? "default" : "secondary"}>
                  {team.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm">{new Date(team.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm">{new Date(team.updated_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Remove Member Dialog */}
      <Dialog open={showRemoveMemberDialog} onOpenChange={setShowRemoveMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.first_name} {selectedMember?.last_name} from this team?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveMemberDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRemoveMember} variant="destructive">
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
