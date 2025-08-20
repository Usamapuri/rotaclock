"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Edit, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { AuthService } from "@/lib/auth"
import { useRouter } from "next/navigation"

interface Team {
  id: string
  name: string
  department?: string
  description?: string
  member_count?: number
  is_active?: boolean
}

interface Project {
  id: string
  name: string
}

export default function PMTeamsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [transfer, setTransfer] = useState<{ employeeId: string; targetTeamId: string }>({ employeeId: '', targetTeamId: '' })
  const [assign, setAssign] = useState<{ teamId: string; projectId: string }>({ teamId: '', projectId: '' })
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    department: '',
    description: '',
    project_id: ''
  })

  useEffect(() => {
    async function load() {
      const user = AuthService.getCurrentUser()
      if (!user?.id) return
      
      try {
        const [teamsRes, projectsRes] = await Promise.all([
          fetch(`/api/teams/by-manager?managerId=${user.id}`),
          fetch(`/api/project-manager/projects`, { headers: { 'authorization': `Bearer ${user.id}` } })
        ])
        const teamsData = await teamsRes.json()
        const projectsData = await projectsRes.json()
        setTeams(teamsData?.data || [])
        setProjects(projectsData?.data?.map((p: any) => ({ id: p.id, name: p.name })) || [])
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load teams and projects')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function createTeam() {
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch('/api/project-manager/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify(createForm)
      })
      
      if (res.ok) {
        toast.success('Team created successfully')
        setIsCreateDialogOpen(false)
        setCreateForm({ name: '', department: '', description: '', project_id: '' })
        // Reload teams
        const teamsRes = await fetch(`/api/teams/by-manager?managerId=${user?.id}`)
        const teamsData = await teamsRes.json()
        setTeams(teamsData?.data || [])
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create team')
      }
    } catch (error) {
      toast.error('Failed to create team')
    }
  }

  async function transferEmployee() {
    if (!transfer.employeeId || !transfer.targetTeamId) {
      toast.error('Please fill in both employee ID and target team')
      return
    }
    
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch('/api/project-manager/teams/transfer-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({ 
          employee_id: transfer.employeeId, 
          target_team_id: transfer.targetTeamId 
        })
      })
      
      if (res.ok) {
        toast.success('Employee transferred successfully')
        setTransfer({ employeeId: '', targetTeamId: '' })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to transfer employee')
      }
    } catch (error) {
      toast.error('Failed to transfer employee')
    }
  }

  async function assignTeamToProject() {
    if (!assign.teamId || !assign.projectId) {
      toast.error('Please select both team and project')
      return
    }
    
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch('/api/project-manager/projects/assign-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({ 
          project_id: assign.projectId, 
          team_id: assign.teamId 
        })
      })
      
      if (res.ok) {
        toast.success('Team assigned to project successfully')
        setAssign({ teamId: '', projectId: '' })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to assign team to project')
      }
    } catch (error) {
      toast.error('Failed to assign team to project')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading teams...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Teams Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Team Name</label>
                <Input
                  placeholder="Enter team name"
                  value={createForm.name}
                  onChange={e => setCreateForm(s => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Department</label>
                <Input
                  placeholder="Enter department"
                  value={createForm.department}
                  onChange={e => setCreateForm(s => ({ ...s, department: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Enter description"
                  value={createForm.description}
                  onChange={e => setCreateForm(s => ({ ...s, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Assign to Project (Optional)</label>
                <Select onValueChange={(value) => setCreateForm(s => ({ ...s, project_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createTeam} className="w-full">Create Team</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {teams.map(team => (
          <Card key={team.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/project-manager/teams/${team.id}/edit`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{team.department || '—'}</Badge>
                {team.is_active !== false && <Badge variant="default">Active</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {team.description || 'No description provided'}
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                <span>{team.member_count || 0} members</span>
              </div>

              {/* Transfer Employee Section */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Transfer Employee to this Team</div>
                <Input 
                  placeholder="Employee UUID" 
                  value={transfer.employeeId} 
                  onChange={e => setTransfer(s => ({ ...s, employeeId: e.target.value }))} 
                />
                <Button 
                  size="sm" 
                  onClick={transferEmployee}
                  disabled={!transfer.employeeId}
                  className="w-full"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Transfer
                </Button>
              </div>

              {/* Assign Team to Project Section */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Assign Team to a Managed Project</div>
                <div className="flex gap-2">
                  <Select onValueChange={(value) => setAssign({ teamId: team.id, projectId: value })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    onClick={assignTeamToProject}
                    disabled={!assign.projectId || assign.teamId !== team.id}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No teams assigned yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first team to get started
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        </div>
      )}
    </div>
  )
}


