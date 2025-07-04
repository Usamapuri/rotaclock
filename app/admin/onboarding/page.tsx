"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Clock,
  Users,
  LogOut,
  Plus,
  CheckCircle,
  AlertTriangle,
  FileText,
  User,
  Settings,
  Eye,
  Download,
  Upload,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  useOnboardingTemplates,
  useOnboardingProcesses,
  useOnboardingDocuments,
  useEmployees,
} from "@/hooks/useOnboarding"
import { toast } from "@/hooks/use-toast"

export default function AdminOnboarding() {
  const [adminUser, setAdminUser] = useState("")
  const [activeTab, setActiveTab] = useState("processes")
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false)
  const [showStartProcessDialog, setShowStartProcessDialog] = useState(false)
  const [selectedProcess, setSelectedProcess] = useState<any>(null)
  const router = useRouter()

  // Use custom hooks for data management
  const { templates, loading: templatesLoading, createTemplate } = useOnboardingTemplates()
  const { processes, loading: processesLoading, createProcess, completeStep, uncompleteStep } = useOnboardingProcesses()
  const { documents, loading: documentsLoading } = useOnboardingDocuments()
  const { employees, loading: employeesLoading } = useEmployees()

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    department: "",
    position: "",
    steps: [] as any[],
  })

  const [newProcess, setNewProcess] = useState({
    employee_id: "",
    template_id: "",
    start_date: "",
    assigned_mentor: "",
    notes: "",
  })

  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [isCreatingProcess, setIsCreatingProcess] = useState(false)

  useEffect(() => {
    const storedAdminUser = localStorage.getItem("adminUser")
    if (!storedAdminUser) {
      router.push("/admin/login")
    } else {
      setAdminUser(storedAdminUser)
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("adminUser")
    router.push("/admin/login")
  }

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.department || !newTemplate.position) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingTemplate(true)
      await createTemplate(newTemplate)

      setNewTemplate({
        name: "",
        description: "",
        department: "",
        position: "",
        steps: [],
      })
      setShowCreateTemplateDialog(false)

      toast({
        title: "Success",
        description: "Onboarding template created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create template",
        variant: "destructive",
      })
    } finally {
      setIsCreatingTemplate(false)
    }
  }

  const handleStartProcess = async () => {
    if (!newProcess.employee_id || !newProcess.template_id || !newProcess.start_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingProcess(true)
      const template = templates.find((t) => t.id === newProcess.template_id)
      const employee = employees.find((e) => e.id === newProcess.employee_id)

      if (!template || !employee) {
        throw new Error("Invalid template or employee selection")
      }

      await createProcess({
        employee_id: employee.id,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        template_id: template.id,
        template_name: template.name,
        start_date: newProcess.start_date,
        assigned_mentor: newProcess.assigned_mentor,
        notes: newProcess.notes,
      })

      setNewProcess({
        employee_id: "",
        template_id: "",
        start_date: "",
        assigned_mentor: "",
        notes: "",
      })
      setShowStartProcessDialog(false)

      toast({
        title: "Success",
        description: "Onboarding process started successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start process",
        variant: "destructive",
      })
    } finally {
      setIsCreatingProcess(false)
    }
  }

  const updateProcessStatus = async (processId: string, stepId: string, completed: boolean) => {
    try {
      if (completed) {
        await completeStep(processId, stepId)
      } else {
        await uncompleteStep(processId, stepId)
      }

      toast({
        title: "Success",
        description: `Step ${completed ? "completed" : "uncompleted"} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update step",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in-progress":
        return "secondary"
      case "overdue":
        return "destructive"
      case "not-started":
        return "outline"
      default:
        return "outline"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "documentation":
        return <FileText className="h-4 w-4" />
      case "training":
        return <Users className="h-4 w-4" />
      case "setup":
        return <Settings className="h-4 w-4" />
      case "orientation":
        return <User className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Calculate stats
  const activeProcesses = processes.filter((p) => p.status === "in-progress").length
  const completedThisMonth = processes.filter((p) => p.status === "completed").length
  const overdueProcesses = processes.filter((p) => p.status === "overdue").length
  const activeTemplates = templates.filter((t) => t.is_active).length

  if (templatesLoading || processesLoading || documentsLoading || employeesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading onboarding data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-purple-600 mr-2" />
                  <span className="text-xl font-bold text-gray-900">ShiftTracker Admin</span>
                </div>
              </Link>
              <Badge variant="outline">Employee Onboarding</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {adminUser}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Processes</p>
                  <p className="text-2xl font-bold">{activeProcesses}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed This Month</p>
                  <p className="text-2xl font-bold">{completedThisMonth}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold">{overdueProcesses}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Templates</p>
                  <p className="text-2xl font-bold">{activeTemplates}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="processes">Active Processes</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Active Processes Tab */}
          <TabsContent value="processes" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Onboarding Processes</h2>
              <Dialog open={showStartProcessDialog} onOpenChange={setShowStartProcessDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Process
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start New Onboarding Process</DialogTitle>
                    <DialogDescription>Begin onboarding for a new employee</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="employee">Employee</Label>
                      <Select
                        value={newProcess.employee_id}
                        onValueChange={(value) => setNewProcess({ ...newProcess, employee_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.first_name} {employee.last_name} - {employee.department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="template">Onboarding Template</Label>
                      <Select
                        value={newProcess.template_id}
                        onValueChange={(value) => setNewProcess({ ...newProcess, template_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates
                            .filter((t) => t.is_active)
                            .map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name} - {template.department}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={newProcess.start_date}
                        onChange={(e) => setNewProcess({ ...newProcess, start_date: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="mentor">Assigned Mentor</Label>
                      <Select
                        value={newProcess.assigned_mentor}
                        onValueChange={(value) => setNewProcess({ ...newProcess, assigned_mentor: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select mentor" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={`${employee.first_name} ${employee.last_name}`}>
                              {employee.first_name} {employee.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newProcess.notes}
                        onChange={(e) => setNewProcess({ ...newProcess, notes: e.target.value })}
                        placeholder="Any special instructions or notes..."
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={handleStartProcess} disabled={isCreatingProcess}>
                        {isCreatingProcess && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Start Process
                      </Button>
                      <Button variant="outline" onClick={() => setShowStartProcessDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {processes.map((process) => (
                <Card key={process.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{process.employee_name}</span>
                          <Badge variant={getStatusColor(process.status)}>{process.status}</Badge>
                        </CardTitle>
                        <CardDescription>
                          {process.template_name} • Started: {new Date(process.start_date).toLocaleDateString()}
                          {process.assigned_mentor && ` • Mentor: ${process.assigned_mentor}`}
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedProcess(process)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Progress</span>
                          <span className="text-sm text-gray-600">{Math.round(process.progress)}%</span>
                        </div>
                        <Progress value={process.progress} className="h-2" />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Expected Completion</p>
                          <p className="font-medium">
                            {new Date(process.expected_completion_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Completed Steps</p>
                          <p className="font-medium">
                            {process.step_completions?.length || 0} /{" "}
                            {templates.find((t) => t.id === process.template_id)?.onboarding_steps?.length || 0}
                          </p>
                        </div>
                      </div>

                      {process.notes && (
                        <div>
                          <p className="text-sm text-gray-600">Notes</p>
                          <p className="text-sm">{process.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Onboarding Templates</h2>
              <Dialog open={showCreateTemplateDialog} onOpenChange={setShowCreateTemplateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Onboarding Template</DialogTitle>
                    <DialogDescription>Define a reusable onboarding process for specific roles</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="templateName">Template Name</Label>
                        <Input
                          id="templateName"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                          placeholder="Sales Associate Onboarding"
                        />
                      </div>
                      <div>
                        <Label htmlFor="department">Department</Label>
                        <Select
                          value={newTemplate.department}
                          onValueChange={(value) => setNewTemplate({ ...newTemplate, department: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Support">Support</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="IT">IT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={newTemplate.position}
                        onChange={(e) => setNewTemplate({ ...newTemplate, position: e.target.value })}
                        placeholder="Sales Associate"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                        placeholder="Describe this onboarding template..."
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={handleCreateTemplate} disabled={isCreatingTemplate}>
                        {isCreatingTemplate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create Template
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateTemplateDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{template.name}</span>
                          <Badge variant={template.is_active ? "default" : "secondary"}>
                            {template.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {template.department} • {template.position} • {Math.ceil(template.total_estimated_time / 60)}{" "}
                          hours
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          Duplicate
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                    <div>
                      <p className="text-sm font-medium mb-2">Steps ({template.onboarding_steps?.length || 0})</p>
                      <div className="space-y-2">
                        {(template.onboarding_steps || []).slice(0, 3).map((step: any) => (
                          <div key={step.id} className="flex items-center space-x-2 text-sm">
                            {getCategoryIcon(step.category)}
                            <span>{step.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {step.estimated_time}m
                            </Badge>
                            {step.required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                        ))}
                        {(template.onboarding_steps?.length || 0) > 3 && (
                          <p className="text-xs text-gray-500">
                            +{(template.onboarding_steps?.length || 0) - 3} more steps
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Onboarding Documents</h2>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>

            <div className="space-y-4">
              {documents.map((document) => (
                <Card key={document.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div>
                          <h4 className="font-semibold">{document.name}</h4>
                          <p className="text-sm text-gray-600 capitalize">{document.type}</p>
                          <p className="text-xs text-gray-500">
                            Created on {new Date(document.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {document.required && <Badge variant="destructive">Required</Badge>}
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Onboarding Analytics</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Completion Rates</CardTitle>
                  <CardDescription>Onboarding completion statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Overall Completion Rate</span>
                      <span className="font-bold text-green-600">
                        {processes.length > 0 ? Math.round((completedThisMonth / processes.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Completion Time</span>
                      <span className="font-bold">4.2 days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>On-time Completion</span>
                      <span className="font-bold text-blue-600">78%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department Performance</CardTitle>
                  <CardDescription>Completion rates by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Sales</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={90} className="w-20 h-2" />
                        <span className="text-sm font-medium">90%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Support</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={85} className="w-20 h-2" />
                        <span className="text-sm font-medium">85%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Marketing</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={75} className="w-20 h-2" />
                        <span className="text-sm font-medium">75%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Process Detail Modal */}
        {selectedProcess && (
          <Dialog open={!!selectedProcess} onOpenChange={() => setSelectedProcess(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedProcess.employee_name} - Onboarding Progress</DialogTitle>
                <DialogDescription>
                  {selectedProcess.template_name} • Started: {new Date(selectedProcess.start_date).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{Math.round(selectedProcess.progress)}%</p>
                    <p className="text-sm text-gray-600">Complete</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{selectedProcess.step_completions?.length || 0}</p>
                    <p className="text-sm text-gray-600">Steps Done</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {templates.find((t) => t.id === selectedProcess.template_id)?.onboarding_steps?.length || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total Steps</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Onboarding Steps</h4>
                  <div className="space-y-3">
                    {templates
                      .find((t) => t.id === selectedProcess.template_id)
                      ?.onboarding_steps?.map((step: any, index: number) => {
                        const isCompleted = selectedProcess.step_completions?.some((c: any) => c.step_id === step.id)
                        return (
                          <div key={step.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isCompleted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {isCompleted ? <CheckCircle className="h-4 w-4" /> : <span>{index + 1}</span>}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium">{step.title}</h5>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {step.estimated_time}m
                                  </Badge>
                                  {step.required && (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    variant={isCompleted ? "destructive" : "default"}
                                    onClick={() => updateProcessStatus(selectedProcess.id, step.id, !isCompleted)}
                                  >
                                    {isCompleted ? "Mark Incomplete" : "Mark Complete"}
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                              {step.assigned_to && (
                                <p className="text-xs text-gray-500">Assigned to: {step.assigned_to}</p>
                              )}
                              {step.instructions && (
                                <p className="text-xs text-blue-600 mt-1">Instructions: {step.instructions}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
