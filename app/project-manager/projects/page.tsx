"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuthService } from "@/lib/auth"
import { Plus, Users, UserPlus, Crown, Building } from "lucide-react"

type Project = { 
  id: string; 
  name: string; 
  description?: string;
  teams?: Team[];
}

type Team = { 
  id: string; 
  name: string; 
  department?: string; 
  description?: string;
  project_id?: string;
  team_lead_id?: string;
  team_lead?: Employee;
  members?: Employee[];
}

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department?: string;
  team_id?: string;
}

export default function PMProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [teamLeads, setTeamLeads] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [showAssignTeamLeadModal, setShowAssignTeamLeadModal] = useState(false)
  const [showAssignEmployeeModal, setShowAssignEmployeeModal] = useState(false)
  
  // Form states
  const [newTeam, setNewTeam] = useState({ name: '', department: '', description: '', project_id: '' })
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [selectedTeamLead, setSelectedTeamLead] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  useEffect(() => {
    async function load() {
      const user = AuthService.getCurrentUser()
      if (!user?.id) return
      
      try {
        // Load projects assigned to this manager
        const projectsRes = await fetch('/api/project-manager/projects', {
          headers: { 'authorization': `Bearer ${user.id}` }
        })
        const projectsData = await projectsRes.json()
        const projectsList = projectsData?.data || []
        setProjects(projectsList)

        // Load teams for these projects
        const teamsRes = await fetch('/api/teams')
        const teamsData = await teamsRes.json()
        const teamsList = teamsData?.data || []
        setTeams(teamsList)

        // Load all employees
        const employeesRes = await fetch('/api/employees')
        const employeesData = await employeesRes.json()
        const employeesList = employeesData?.data || []
        setEmployees(employeesList)

        // Load team leads
        const teamLeadsList = employeesList.filter((emp: Employee) => emp.role === 'team_lead')
        setTeamLeads(teamLeadsList)

        setLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim() || !newTeam.project_id) {
      alert('Team name and project are required')
      return
    }

    try {
      const user = AuthService.getCurrentUser()
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify(newTeam)
      })

      if (response.ok) {
        const data = await response.json()
        setTeams(prev => [...prev, data.data])
        setNewTeam({ name: '', department: '', description: '', project_id: '' })
        setShowCreateTeamModal(false)
        alert('Team created successfully!')
        // Reload data
        window.location.reload()
      } else {
        const error = await response.json()
        alert('Failed to create team: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating team:', error)
      alert('Failed to create team')
    }
  }

  const handleAssignTeamLead = async () => {
    if (!selectedTeam || !selectedTeamLead) {
      alert('Please select both team and team lead')
      return
    }

    try {
      const user = AuthService.getCurrentUser()
      const response = await fetch(`/api/teams/${selectedTeam.id}/assign-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({ team_lead_id: selectedTeamLead })
      })

      if (response.ok) {
        setTeams(prev => prev.map(team => 
          team.id === selectedTeam.id 
            ? { ...team, team_lead_id: selectedTeamLead }
            : team
        ))
        setShowAssignTeamLeadModal(false)
        setSelectedTeam(null)
        setSelectedTeamLead('')
        alert('Team lead assigned successfully!')
        // Reload data
        window.location.reload()
      } else {
        const error = await response.json()
        alert('Failed to assign team lead: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error assigning team lead:', error)
      alert('Failed to assign team lead')
    }
  }

  const handleAssignEmployee = async () => {
    if (!selectedTeam || !selectedEmployee) {
      alert('Please select both team and employee')
      return
    }

    try {
      const user = AuthService.getCurrentUser()
      const response = await fetch(`/api/teams/${selectedTeam.id}/assign-employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({ employee_id: selectedEmployee })
      })

      if (response.ok) {
        setShowAssignEmployeeModal(false)
        setSelectedTeam(null)
        setSelectedEmployee('')
        alert('Employee assigned to team successfully!')
        // Reload data
        window.location.reload()
      } else {
        const error = await response.json()
        alert('Failed to assign employee: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error assigning employee:', error)
      alert('Failed to assign employee')
    }
  }

  const getTeamsForProject = (projectId: string) => {
    return teams.filter(team => team.project_id === projectId)
  }

  const getTeamMembers = (teamId: string) => {
    return employees.filter(emp => emp.team_id === teamId)
  }

  const getTeamLead = (teamLeadId: string) => {
    return employees.find(emp => emp.id === teamLeadId)
  }

  if (loading) {
    return <div className="text-center py-8">Loading projects...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Team button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <Button onClick={() => setShowCreateTeamModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Team
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {projects.map(project => {
          const projectTeams = getTeamsForProject(project.id)
          
          return (
            <Card key={project.id} className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {project.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{project.description || 'No description'}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Teams Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Teams ({projectTeams.length})
                      </h3>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedProject(project)
                          setShowCreateTeamModal(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Team
                      </Button>
                    </div>
                    
                    {projectTeams.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No teams created yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {projectTeams.map(team => {
                          const teamMembers = getTeamMembers(team.id)
                          const teamLead = getTeamLead(team.team_lead_id || '')
                          
                          return (
                            <div key={team.id} className="border rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{team.name}</h4>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTeam(team)
                                      setShowAssignTeamLeadModal(true)
                                    }}
                                  >
                                    <Crown className="h-3 w-3 mr-1" />
                                    {teamLead ? 'Change Lead' : 'Assign Lead'}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTeam(team)
                                      setShowAssignEmployeeModal(true)
                                    }}
                                  >
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Add Member
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="text-sm text-gray-600 mb-2">
                                {team.department && <span className="mr-3">Dept: {team.department}</span>}
                                {team.description && <span>Desc: {team.description}</span>}
                              </div>
                              
                              {/* Team Lead */}
                              {teamLead && (
                                <div className="mb-2">
                                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                    <Crown className="h-3 w-3" />
                                    Lead: {teamLead.first_name} {teamLead.last_name}
                                  </Badge>
                                </div>
                              )}
                              
                              {/* Team Members */}
                              <div>
                                <span className="text-sm text-gray-600">Members ({teamMembers.length}):</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {teamMembers.map(member => (
                                    <Badge key={member.id} variant="outline" className="text-xs">
                                      {member.first_name} {member.last_name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No projects assigned to you yet.</p>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Create New Team</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Team Name</label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter team name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Department</label>
                <input
                  type="text"
                  value={newTeam.department}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter department (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border rounded px-3 py-2 h-20"
                  placeholder="Enter team description (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Project</label>
                <select
                  value={newTeam.project_id}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, project_id: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateTeamModal(false)
                    setNewTeam({ name: '', department: '', description: '', project_id: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTeam}
                  disabled={!newTeam.name.trim() || !newTeam.project_id}
                >
                  Create Team
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Team Lead Modal */}
      {showAssignTeamLeadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Assign Team Lead</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Team</label>
                <input
                  type="text"
                  value={selectedTeam?.name || ''}
                  className="w-full border rounded px-3 py-2 bg-gray-50"
                  disabled
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Select Team Lead</label>
                <select
                  value={selectedTeamLead}
                  onChange={(e) => setSelectedTeamLead(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select a team lead</option>
                  {teamLeads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.first_name} {lead.last_name} ({lead.department || 'No dept'})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAssignTeamLeadModal(false)
                    setSelectedTeam(null)
                    setSelectedTeamLead('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignTeamLead}
                  disabled={!selectedTeamLead}
                >
                  Assign Team Lead
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      {showAssignEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Assign Employee to Team</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Team</label>
                <input
                  type="text"
                  value={selectedTeam?.name || ''}
                  className="w-full border rounded px-3 py-2 bg-gray-50"
                  disabled
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Select Employee</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select an employee</option>
                  {employees
                    .filter(emp => emp.role === 'employee' && !emp.team_id)
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.department || 'No dept'})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only showing unassigned employees
                </p>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAssignEmployeeModal(false)
                    setSelectedTeam(null)
                    setSelectedEmployee('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignEmployee}
                  disabled={!selectedEmployee}
                >
                  Assign Employee
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


