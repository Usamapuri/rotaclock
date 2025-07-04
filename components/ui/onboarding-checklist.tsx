"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Clock, FileText, Users, Settings, User } from "lucide-react"

interface OnboardingStep {
  id: string
  title: string
  description: string
  category: "documentation" | "training" | "setup" | "orientation"
  required: boolean
  estimatedTime: number
  completed: boolean
  assignedTo?: string
  instructions?: string
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[]
  onStepComplete: (stepId: string) => void
  onStepUncomplete: (stepId: string) => void
}

export function OnboardingChecklist({ steps, onStepComplete, onStepUncomplete }: OnboardingChecklistProps) {
  const completedSteps = steps.filter((step) => step.completed).length
  const totalSteps = steps.length
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "documentation":
        return "text-blue-600 bg-blue-50"
      case "training":
        return "text-green-600 bg-green-50"
      case "setup":
        return "text-purple-600 bg-purple-50"
      case "orientation":
        return "text-orange-600 bg-orange-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Onboarding Checklist</span>
          <Badge variant="outline">
            {completedSteps}/{totalSteps} Complete
          </Badge>
        </CardTitle>
        <CardDescription>Track your progress through the onboarding process</CardDescription>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`p-4 border rounded-lg transition-all ${
                step.completed ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {step.completed ? <CheckCircle className="h-4 w-4" /> : <span>{index + 1}</span>}
                  </div>
                  <div className={`p-2 rounded-lg ${getCategoryColor(step.category)}`}>
                    {getCategoryIcon(step.category)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{step.title}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {step.estimatedTime}m
                      </Badge>
                      {step.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                      {step.completed && <Badge className="text-xs">Completed</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                  {step.assignedTo && <p className="text-xs text-gray-500 mb-2">Assigned to: {step.assignedTo}</p>}
                  {step.instructions && <p className="text-sm text-blue-600 mb-3">{step.instructions}</p>}
                  <div className="flex space-x-2">
                    {!step.completed ? (
                      <Button size="sm" onClick={() => onStepComplete(step.id)}>
                        Mark Complete
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => onStepUncomplete(step.id)}>
                        Mark Incomplete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
