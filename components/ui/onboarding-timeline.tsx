"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertTriangle, Calendar } from "lucide-react"

interface TimelineEvent {
  id: string
  title: string
  description: string
  date: string
  type: "completed" | "upcoming" | "overdue" | "milestone"
  assignedTo?: string
}

interface OnboardingTimelineProps {
  events: TimelineEvent[]
  startDate: string
  expectedEndDate: string
}

export function OnboardingTimeline({ events, startDate, expectedEndDate }: OnboardingTimelineProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "upcoming":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "milestone":
        return <Calendar className="h-4 w-4 text-purple-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case "completed":
        return "border-green-200 bg-green-50"
      case "upcoming":
        return "border-blue-200 bg-blue-50"
      case "overdue":
        return "border-red-200 bg-red-50"
      case "milestone":
        return "border-purple-200 bg-purple-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "completed":
        return "Completed"
      case "upcoming":
        return "Upcoming"
      case "overdue":
        return "Overdue"
      case "milestone":
        return "Milestone"
      default:
        return "Event"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Timeline</CardTitle>
        <CardDescription>
          Started: {new Date(startDate).toLocaleDateString()} • Expected completion:{" "}
          {new Date(expectedEndDate).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="flex items-start space-x-4">
              <div className="flex flex-col items-center">
                <div className={`p-2 rounded-full border-2 ${getEventColor(event.type)}`}>
                  {getEventIcon(event.type)}
                </div>
                {index < events.length - 1 && <div className="w-px h-8 bg-gray-200 mt-2" />}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold">{event.title}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(event.type)}
                    </Badge>
                    <span className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">{event.description}</p>
                {event.assignedTo && <p className="text-xs text-gray-500">Assigned to: {event.assignedTo}</p>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
