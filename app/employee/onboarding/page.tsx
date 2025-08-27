"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Clock,
  LogOut,
  CheckCircle,
  FileText,
  Users,
  Settings,
  User,
  Calendar,
  Download,
  MessageSquare,
  Star,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

interface OnboardingStep {
  id: string
  title: string
  description: string
  category: "documentation" | "training" | "setup" | "orientation"
  required: boolean
  estimated_time: number
  step_order: number
  assigned_to?: string
  instructions?: string
  completed: boolean
  completedAt?: string
  feedback?: string
}

interface OnboardingProcess {
  id: string
  template_name: string
  start_date: string
  expected_completion_date: string
  assigned_mentor?: string
  progress: number
  status: "not-started" | "in-progress" | "completed"
  steps: OnboardingStep[]
  welcomeMessage?: string
}

export default function EmployeeOnboarding() {
  const [employeeId, setEmployeeId] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [feedback, setFeedback] = useState("")
  const [loading, setLoading] = useState(true)
  const [onboardingProcess, setOnboardingProcess] = useState<OnboardingProcess | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const router = useRouter()

  // Load documents on component mount
  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setDocumentsLoading(true)
    try {
      const response = await fetch('/api/onboarding/documents')
      const data = await response.json()
      if (response.ok) {
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setDocumentsLoading(false)
    }
  }

  useEffect(() => {
    const storedEmployeeId = localStorage.getItem("employeeId")
    if (!storedEmployeeId) {
      router.push("/login")
    } else {
      setEmployeeId(storedEmployeeId)
      fetchOnboardingProcess(storedEmployeeId)
    }
  }, [router])

  const fetchOnboardingProcess = async (empId: string) => {
    try {
      setLoading(true)
      // In a real implementation, you would fetch the employee's onboarding process
      // For now, we'll use mock data that matches the database structure
      const mockProcess: OnboardingProcess = {
        id: "1",
        template_name: "Sales Associate Onboarding",
        start_date: "2024-01-08",
        expected_completion_date: "2024-01-15",
        assigned_mentor: "John Doe",
        progress: 40,
        status: "in-progress",
        welcomeMessage:
          "Welcome to our team! We're excited to have you join us. This onboarding process will help you get familiar with our company culture, policies, and your role. Your mentor John Doe will be available to help you throughout this process.",
        steps: [
          {
            id: "welcome",
            title: "Welcome & Introduction",
            description: "Meet the team and get oriented with the company",
            category: "orientation",
            required: true,
            estimated_time: 60,
            step_order: 1,
            assigned_to: "HR Manager",
            instructions: "Please attend the welcome meeting scheduled for 9:00 AM in the conference room.",
            completed: true,
            completedAt: "2024-01-08T09:30:00Z",
          },
          {
            id: "handbook",
            title: "Employee Handbook Review",
            description: "Read and acknowledge company policies and procedures",
            category: "documentation",
            required: true,
            estimated_time: 90,
            step_order: 2,
            completed: true,
            completedAt: "2024-01-08T11:00:00Z",
            feedback: "Very comprehensive handbook. The policies are clear and well-explained.",
          },
          {
            id: "system-access",
            title: "System Access Setup",
            description: "Create accounts and provide access to necessary systems",
            category: "setup",
            required: true,
            estimated_time: 45,
            step_order: 3,
            assigned_to: "IT Department",
            instructions: "IT will contact you to set up your accounts. Please have your ID ready.",
            completed: false,
          },
          {
            id: "sales-training",
            title: "Sales Training Program",
            description: "Complete sales methodology and product training",
            category: "training",
            required: true,
            estimated_time: 240,
            step_order: 4,
            assigned_to: "Sales Manager",
            completed: false,
          },
          {
            id: "shadowing",
            title: "Job Shadowing",
            description: "Shadow experienced team member for practical learning",
            category: "training",
            required: true,
            estimated_time: 120,
            step_order: 5,
            completed: false,
          },
        ],
      }
      setOnboardingProcess(mockProcess)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load onboarding process",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("employeeId")
    router.push("/login")
  }

  const markStepComplete = async (stepId: string) => {
    if (!onboardingProcess) return

    try {
      // In a real implementation, this would call the API
      const response = await fetch("/api/onboarding/steps/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          process_id: onboardingProcess.id,
          step_id: stepId,
          completed_by: employeeId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to complete step")
      }

      // Update local state
      setOnboardingProcess((prev) => {
        if (!prev) return prev

        const updatedSteps = prev.steps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                completed: true,
                completedAt: new Date().toISOString(),
              }
            : step,
        )

        const completedSteps = updatedSteps.filter((s) => s.completed).length
        const totalSteps = updatedSteps.length
        const newProgress = (completedSteps / totalSteps) * 100

        return {
          ...prev,
          steps: updatedSteps,
          progress: newProgress,
          status: newProgress === 100 ? "completed" : "in-progress",
        }
      })

      toast({
        title: "Success",
        description: "Step marked as complete",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete step",
        variant: "destructive",
      })
    }
  }

  const addStepFeedback = async (stepId: string, feedbackText: string) => {
    if (!onboardingProcess) return

    try {
      const response = await fetch("/api/onboarding/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          process_id: onboardingProcess.id,
          step_id: stepId,
          feedback_text: feedbackText,
          feedback_type: "step",
          submitted_by: employeeId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit feedback")
      }

      setOnboardingProcess((prev) => {
        if (!prev) return prev

        return {
          ...prev,
          steps: prev.steps.map((step) => (step.id === stepId ? { ...step, feedback: feedbackText } : step)),
        }
      })

      toast({
        title: "Success",
        description: "Feedback submitted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      })
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

  const getStepStatus = (step: OnboardingStep) => {
    if (step.completed) return "completed"

    // Check if dependencies are met (simplified - in real app would check actual dependencies)
    const currentStepIndex = onboardingProcess?.steps.findIndex((s) => s.id === step.id) || 0
    const previousStepsCompleted = onboardingProcess?.steps.slice(0, currentStepIndex).every((s) => s.completed) || true

    return previousStepsCompleted ? "available" : "locked"
  }

  if (loading || documentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your onboarding...</span>
        </div>
      </div>
    )
  }

  if (!onboardingProcess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">No Onboarding Process Found</h2>
            <p className="text-gray-600 mb-4">
              You don't have an active onboarding process. Please contact HR for assistance.
            </p>
            <Button onClick={() => router.push("/employee/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completedSteps = onboardingProcess.steps.filter((s) => s.completed).length
  const totalSteps = onboardingProcess.steps.length
  const nextStep = onboardingProcess.steps.find((s) => !s.completed && getStepStatus(s) === "available")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/employee/dashboard">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="text-xl font-bold text-gray-900">ShiftTracker</span>
                </div>
              </Link>
              <Badge variant="outline">My Onboarding</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Employee {employeeId}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Your Onboarding Journey! 🎉</CardTitle>
            <CardDescription>{onboardingProcess.template_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {onboardingProcess.welcomeMessage && <p className="text-gray-700">{onboardingProcess.welcomeMessage}</p>}

              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{Math.round(onboardingProcess.progress)}%</p>
                  <p className="text-sm text-gray-600">Complete</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {completedSteps}/{totalSteps}
                  </p>
                  <p className="text-sm text-gray-600">Steps Done</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {new Date(onboardingProcess.expected_completion_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">Target Date</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-gray-600">{Math.round(onboardingProcess.progress)}%</span>
                </div>
                <Progress value={onboardingProcess.progress} className="h-3" />
              </div>

              {onboardingProcess.assigned_mentor && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm">
                    <strong>Your Mentor:</strong> {onboardingProcess.assigned_mentor}
                  </p>
                  <p className="text-xs text-gray-600">
                    Feel free to reach out to your mentor if you have any questions or need assistance.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {nextStep && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Next Step
                  </CardTitle>
                  <CardDescription>Continue your onboarding journey</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center space-x-2">{getCategoryIcon(nextStep.category)}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{nextStep.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{nextStep.description}</p>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {nextStep.estimated_time} minutes
                        </Badge>
                        {nextStep.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      {nextStep.instructions && <p className="text-sm text-blue-600 mb-3">{nextStep.instructions}</p>}
                      {nextStep.assigned_to && (
                        <p className="text-xs text-gray-500 mb-3">Contact: {nextStep.assigned_to}</p>
                      )}
                      <Button onClick={() => markStepComplete(nextStep.id)}>Mark as Complete</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your onboarding progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {onboardingProcess.steps
                    .filter((step) => step.completed)
                    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
                    .slice(0, 3)
                    .map((step) => (
                      <div key={step.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium">{step.title}</p>
                          <p className="text-sm text-gray-600">
                            Completed on {new Date(step.completedAt!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Steps Tab */}
          <TabsContent value="steps" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Steps</CardTitle>
                <CardDescription>Complete all steps to finish your onboarding</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {onboardingProcess.steps
                    .sort((a, b) => a.step_order - b.step_order)
                    .map((step, index) => {
                      const status = getStepStatus(step)
                      return (
                        <div
                          key={step.id}
                          className={`p-4 border rounded-lg ${
                            step.completed
                              ? "bg-green-50 border-green-200"
                              : status === "available"
                                ? "bg-blue-50 border-blue-200"
                                : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  step.completed
                                    ? "bg-green-100 text-green-600"
                                    : status === "available"
                                      ? "bg-blue-100 text-blue-600"
                                      : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {step.completed ? <CheckCircle className="h-4 w-4" /> : <span>{step.step_order}</span>}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">{step.title}</h4>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {step.estimated_time}m
                                  </Badge>
                                  {step.required && (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                  {step.completed && <Badge className="text-xs">Completed</Badge>}
                                  {status === "locked" && (
                                    <Badge variant="secondary" className="text-xs">
                                      Locked
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                              {step.assigned_to && (
                                <p className="text-xs text-gray-500 mb-2">Contact: {step.assigned_to}</p>
                              )}
                              {step.instructions && <p className="text-sm text-blue-600 mb-3">{step.instructions}</p>}
                              {!step.completed && status === "available" && (
                                <Button size="sm" onClick={() => markStepComplete(step.id)}>
                                  Mark as Complete
                                </Button>
                              )}
                              {step.completed && step.feedback && (
                                <div className="mt-3 p-2 bg-white rounded border">
                                  <p className="text-xs font-medium">Your Feedback:</p>
                                  <p className="text-sm text-gray-600">{step.feedback}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Documents</CardTitle>
                <CardDescription>Important documents for your review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div>
                          <h4 className="font-semibold">{document.name}</h4>
                          <p className="text-sm text-gray-600 capitalize">{document.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {document.required && <Badge variant="destructive">Required</Badge>}
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Share Your Feedback</CardTitle>
                <CardDescription>Help us improve the onboarding experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Overall Onboarding Experience</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button key={rating} variant="outline" size="sm">
                        <Star className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Additional Comments</label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Share your thoughts about the onboarding process..."
                    className="min-h-[100px]"
                  />
                </div>

                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Submit Feedback
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step-by-Step Feedback</CardTitle>
                <CardDescription>Provide feedback for completed steps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {onboardingProcess.steps
                    .filter((step) => step.completed)
                    .map((step) => (
                      <div key={step.id} className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">{step.title}</h4>
                        <Textarea
                          value={step.feedback || ""}
                          onChange={(e) => addStepFeedback(step.id, e.target.value)}
                          placeholder="How was this step? Any suggestions for improvement?"
                          className="min-h-[80px]"
                        />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
