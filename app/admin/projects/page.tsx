"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Users, Briefcase } from "lucide-react"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  manager_count?: number
  team_count?: number
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
  description?: string
  project_id?: string
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isAssignTeamDialogOpen, setIsAssignTeamDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const user = AuthService.getCurrentUser()
      
      // Load projects
      const projectsRes = await fetch('/api/admin/projects', {
        headers: { 'authorization': `Bearer ${user?.id || ''}` }
      })
      const projectsData = await projectsRes.json()
      
      // Load employees (project managers)
      const employeesRes = await fetch('/api/employees', {
        headers: { 'authorization': `Bearer ${user?.id || ''}` }
      })
      const employeesData = await employeesRes.json()
      
      // Load teams
      const teamsRes = await fetch('/api/admin/teams', {
        headers: { 'authorization': `Bearer ${user?.id || ''}` }
      })
      const teamsData = await teamsRes.json()

      setProjects(projectsData?.data || [])
      setEmployees(employeesData?.data || [])
      setTeams(teamsData?.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function createProject() {
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success('Project created successfully')
        setIsCreateDialogOpen(false)
        setFormData({ name: "", description: "" })
        loadData()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project')
    }
  }

  async function updateProject() {
    if (!selectedProject) return
    
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch(`/api/admin/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success('Project updated successfully')
        setIsEditDialogOpen(false)
        setSelectedProject(null)
        setFormData({ name: "", description: "" })
        loadData()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update project')
      }
    } catch (error) {
      console.error('Error updating project:', error)
      toast.error('Failed to update project')
    }
  }

  async function deleteProject(projectId: string) {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'authorization': `Bearer ${user?.id || ''}` }
      })

      if (res.ok) {
        toast.success('Project deleted successfully')
        loadData()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete project')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
    }
  }

  async function assignManager(projectId: string, managerId: string) {
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch('/api/admin/projects/assign-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({ project_id: projectId, manager_id: managerId })
      })

      if (res.ok) {
        toast.success('Project manager assigned successfully')
        setIsAssignDialogOpen(false)
        loadData()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to assign project manager')
      }
    } catch (error) {
      console.error('Error assigning manager:', error)
      toast.error('Failed to assign project manager')
    }
  }

  async function assignTeam(projectId: string, teamId: string) {
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch('/api/admin/projects/assign-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({ project_id: projectId, team_id: teamId })
      })

      if (res.ok) {
        toast.success('Team assigned to project successfully')
        setIsAssignTeamDialogOpen(false)
        loadData()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to assign team to project')
      }
    } catch (error) {
      console.error('Error assigning team:', error)
      toast.error('Failed to assign team to project')
    }
  }

  function openEditDialog(project: Project) {
    setSelectedProject(project)
    setFormData({
      name: project.name,
      description: project.description || ""
    })
    setIsEditDialogOpen(true)
  }

  function openAssignDialog(project: Project) {
    setSelectedProject(project)
    setIsAssignDialogOpen(true)
  }

  function openAssignTeamDialog(project: Project) {
    setSelectedProject(project)
    setIsAssignTeamDialogOpen(true)
  }

  const projectManagers = employees.filter(emp => emp.role === 'project_manager')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projects Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter project description"
                />
              </div>
              <Button onClick={createProject} className="w-full">
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignDialog(project)}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Manager
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignTeamDialog(project)}
                    >
                      <Briefcase className="w-4 h-4 mr-1" />
                      Team
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(project)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteProject(project.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
              </div>
              <div className="flex gap-2">
                <Badge variant={project.is_active ? "default" : "secondary"}>
                  {project.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {project.description || "No description provided"}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{project.manager_count || 0} managers</span>
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  <span>{project.team_count || 0} teams</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first project to get started
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter project description"
              />
            </div>
            <Button onClick={updateProject} className="w-full">
              Update Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Manager Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Project Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manager">Select Project Manager</Label>
              <Select onValueChange={(value) => assignManager(selectedProject?.id || '', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project manager" />
                </SelectTrigger>
                <SelectContent>
                  {projectManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.first_name} {manager.last_name} ({manager.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Select a project manager to assign to this project. Only employees with the project_manager role can be assigned.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Team Dialog */}
      <Dialog open={isAssignTeamDialogOpen} onOpenChange={setIsAssignTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Team to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team">Select Team</Label>
              <Select onValueChange={(value) => assignTeam(selectedProject?.id || '', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams
                    .filter(team => !team.project_id || team.project_id === selectedProject?.id)
                    .map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} {team.project_id ? '(Already assigned)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Select a team to assign to this project. Teams can only be assigned to one project at a time.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
