"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Play,
  Pause,
  Square,
  Coffee,
  Calendar,
  DollarSign,
  LogOut,
  Timer,
  FileText,
  CalendarX,
  Camera,
  CheckCircle,
  XCircle,
  RotateCcw,
  Shield,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TimeEntry {
  id: string
  type: "clock-in" | "clock-out" | "break-start" | "break-end"
  timestamp: Date
}

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string
  status: "scheduled" | "completed" | "in-progress"
}

export default function EmployeeDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [totalHours, setTotalHours] = useState(156.5)
  const [payPeriodHours, setPayPeriodHours] = useState(32.5)
  const [employeeId, setEmployeeId] = useState("")
  const router = useRouter()

  // Break time management
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(40 * 60) // 40 minutes in seconds
  const [breakTimeUsed, setBreakTimeUsed] = useState(0)
  const [currentBreakStart, setCurrentBreakStart] = useState<Date | null>(null)
  const [breakTimer, setBreakTimer] = useState<NodeJS.Timeout | null>(null)

  // Camera verification for shift start
  const [showCameraVerification, setShowCameraVerification] = useState(false)
  const [cameraVerified, setCameraVerified] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [isLoadingCamera, setIsLoadingCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Request management
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestType, setRequestType] = useState<"timeoff" | "reschedule" | null>(null)

  const upcomingShifts: Shift[] = [
    { id: "1", date: "2024-01-08", startTime: "09:00", endTime: "17:00", status: "scheduled" },
    { id: "2", date: "2024-01-09", startTime: "10:00", endTime: "18:00", status: "scheduled" },
    { id: "3", date: "2024-01-10", startTime: "08:00", endTime: "16:00", status: "scheduled" },
  ]

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    const storedEmployeeId = localStorage.getItem("employeeId")
    if (!storedEmployeeId) {
      router.push("/employee/login")
    } else {
      setEmployeeId(storedEmployeeId)
    }
    return () => clearInterval(timer)
  }, [router])

  // Camera verification functions
  const startCameraVerification = () => {
    setShowCameraVerification(true)
    setCameraVerified(false)
    startCamera()
  }

  const startCamera = async () => {
    setIsLoadingCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setShowCamera(true)
        setCameraError("")
      }
    } catch (error) {
      setCameraError("Camera access denied. Please allow camera access to start your shift.")
      console.error("Camera error:", error)
    } finally {
      setIsLoadingCamera(false)
    }
  }

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)

        // Stop camera stream
        const stream = video.srcObject as MediaStream
        stream?.getTracks().forEach((track) => track.stop())

        setShowCamera(false)
        setCameraVerified(true)
      }
    }
  }, [])

  const retakePhoto = () => {
    setCameraVerified(false)
    startCamera()
  }

  const completeCameraVerification = () => {
    if (cameraVerified) {
      setShowCameraVerification(false)
      // Now proceed with clock in
      proceedWithClockIn()
    }
  }

  const proceedWithClockIn = () => {
    const entry: TimeEntry = {
      id: Date.now().toString(),
      type: "clock-in",
      timestamp: new Date(),
    }
    setTimeEntries([...timeEntries, entry])
    setIsClockedIn(true)
    // Reset break time for new shift
    setBreakTimeRemaining(40 * 60)
    setBreakTimeUsed(0)
  }

  const handleClockIn = () => {
    // Always require camera verification for shift start
    startCameraVerification()
  }

  const handleClockOut = () => {
    const entry: TimeEntry = {
      id: Date.now().toString(),
      type: "clock-out",
      timestamp: new Date(),
    }
    setTimeEntries([...timeEntries, entry])
    setIsClockedIn(false)
    setIsOnBreak(false)
    // Clear any ongoing break timer
    if (breakTimer) {
      clearInterval(breakTimer)
      setBreakTimer(null)
    }
  }

  const handleBreakStart = () => {
    if (breakTimeRemaining <= 0) {
      alert("No break time remaining for this shift")
      return
    }

    const entry: TimeEntry = {
      id: Date.now().toString(),
      type: "break-start",
      timestamp: new Date(),
    }
    setTimeEntries([...timeEntries, entry])
    setIsOnBreak(true)
    setCurrentBreakStart(new Date())

    // Start break countdown timer
    const timer = setInterval(() => {
      setBreakTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsOnBreak(false)
          setCurrentBreakStart(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    setBreakTimer(timer)
  }

  const handleBreakEnd = () => {
    const entry: TimeEntry = {
      id: Date.now().toString(),
      type: "break-end",
      timestamp: new Date(),
    }
    setTimeEntries([...timeEntries, entry])
    setIsOnBreak(false)

    // Calculate break time used and update remaining time
    if (currentBreakStart && breakTimer) {
      const breakDuration = Math.floor((new Date().getTime() - currentBreakStart.getTime()) / 1000)
      setBreakTimeUsed((prev) => prev + breakDuration)
      clearInterval(breakTimer)
      setBreakTimer(null)
      setCurrentBreakStart(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("employeeId")
    router.push("/employee/login")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatBreakTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-blue-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">ShiftTracker</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, Employee {employeeId}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Time */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{currentTime.toLocaleTimeString()}</h1>
          <p className="text-lg text-gray-600">
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Camera Verification Modal */}
        {showCameraVerification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-blue-600" />
                  Shift Verification Required
                </CardTitle>
                <CardDescription>Please verify your identity before starting your shift</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showCamera && !cameraVerified && (
                  <div className="text-center space-y-3">
                    <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                      <Camera className="h-12 w-12 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">Camera verification is required to start your shift</p>
                    <Button onClick={startCamera} disabled={isLoadingCamera} className="w-full">
                      {isLoadingCamera ? "Starting Camera..." : "Start Camera Verification"}
                    </Button>
                  </div>
                )}

                {showCamera && (
                  <div className="text-center space-y-3">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full max-w-sm mx-auto rounded-lg border"
                      />
                      <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-blue-500"></div>
                        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-blue-500"></div>
                        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-blue-500"></div>
                        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-blue-500"></div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Position your face within the frame</p>
                    <Button onClick={capturePhoto} className="w-full">
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo
                    </Button>
                  </div>
                )}

                {cameraVerified && (
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center text-green-600 mb-2">
                      <CheckCircle className="h-6 w-6 mr-2" />
                      <span className="font-semibold">Verification Completed</span>
                    </div>
                    <canvas
                      ref={canvasRef}
                      className="w-full max-w-sm mx-auto rounded-lg border"
                      style={{ maxHeight: "200px" }}
                    />
                    <div className="flex space-x-2">
                      <Button onClick={retakePhoto} variant="outline" className="flex-1 bg-transparent">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retake
                      </Button>
                      <Button onClick={completeCameraVerification} className="flex-1">
                        <Play className="h-4 w-4 mr-2" />
                        Start Shift
                      </Button>
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="flex items-center text-red-600 text-sm p-3 bg-red-50 rounded-lg">
                    <XCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}

                {!cameraVerified && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCameraVerification(false)}
                    className="w-full bg-transparent"
                  >
                    Cancel
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests">My Requests</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Time Tracking Card */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Time Tracking
                    </CardTitle>
                    <CardDescription>Clock in/out and manage your breaks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-center space-x-4">
                      {!isClockedIn ? (
                        <Button onClick={handleClockIn} size="lg" className="bg-green-600 hover:bg-green-700">
                          <Shield className="h-5 w-5 mr-2" />
                          Start Shift (Verify)
                        </Button>
                      ) : (
                        <>
                          <Button onClick={handleClockOut} size="lg" variant="destructive">
                            <Square className="h-5 w-5 mr-2" />
                            Clock Out
                          </Button>
                          {!isOnBreak ? (
                            <Button
                              onClick={handleBreakStart}
                              size="lg"
                              variant="outline"
                              disabled={breakTimeRemaining <= 0}
                            >
                              <Coffee className="h-5 w-5 mr-2" />
                              Start Break
                            </Button>
                          ) : (
                            <Button onClick={handleBreakEnd} size="lg" className="bg-orange-600 hover:bg-orange-700">
                              <Pause className="h-5 w-5 mr-2" />
                              End Break
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    <div className="text-center">
                      <Badge variant={isClockedIn ? "default" : "secondary"}>
                        {isClockedIn ? (isOnBreak ? "On Break" : "Clocked In") : "Clocked Out"}
                      </Badge>
                    </div>

                    {/* Shift Verification Notice */}
                    {!isClockedIn && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Shift Verification</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          Camera verification is required each time you start a shift for security purposes.
                        </p>
                      </div>
                    )}

                    {/* Break Time Information */}
                    {isClockedIn && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Break Time</span>
                          <Timer className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Remaining</p>
                            <p className={`font-bold text-lg ${isOnBreak ? "text-orange-600" : "text-blue-600"}`}>
                              {isOnBreak ? formatTime(breakTimeRemaining) : formatBreakTime(breakTimeRemaining)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Used Today</p>
                            <p className="font-bold text-lg text-gray-700">{formatBreakTime(breakTimeUsed)}</p>
                          </div>
                        </div>
                        {breakTimeRemaining <= 0 && (
                          <p className="text-red-600 text-xs mt-2">Break time exhausted for this shift</p>
                        )}
                      </div>
                    )}

                    {/* Recent Time Entries */}
                    {timeEntries.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold mb-3">Today's Activity</h4>
                        <div className="space-y-2">
                          {timeEntries
                            .slice(-5)
                            .reverse()
                            .map((entry) => (
                              <div key={entry.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium">
                                  {entry.type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                                <span className="text-sm text-gray-600">{entry.timestamp.toLocaleTimeString()}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Stats Sidebar */}
              <div className="space-y-6">
                {/* Hours Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Hours Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Hours Worked</p>
                      <p className="text-2xl font-bold">{totalHours}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Current Pay Period</p>
                      <p className="text-2xl font-bold text-blue-600">{payPeriodHours}h</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Shifts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Upcoming Shifts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingShifts.map((shift) => (
                        <div key={shift.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {new Date(shift.date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                              <p className="text-sm text-gray-600">
                                {shift.startTime} - {shift.endTime}
                              </p>
                            </div>
                            <Badge variant="outline">{shift.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            {/* Employee Requests Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      My Requests
                    </CardTitle>
                    <CardDescription>Submit time off or shift change requests</CardDescription>
                  </div>
                  <div className="space-x-2">
                    <Button
                      onClick={() => {
                        setRequestType("timeoff")
                        setShowRequestForm(true)
                      }}
                      variant="outline"
                    >
                      <CalendarX className="h-4 w-4 mr-2" />
                      Request Time Off
                    </Button>
                    <Button
                      onClick={() => {
                        setRequestType("reschedule")
                        setShowRequestForm(true)
                      }}
                      variant="outline"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Reschedule Shift
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Request Form */}
                {showRequestForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold mb-3">
                      {requestType === "timeoff" ? "Request Time Off" : "Request Shift Reschedule"}
                    </h4>
                    <form className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {requestType === "timeoff" ? "Start Date" : "Current Shift Date"}
                          </label>
                          <input type="date" className="w-full p-2 border rounded" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {requestType === "timeoff" ? "End Date" : "Preferred New Date"}
                          </label>
                          <input type="date" className="w-full p-2 border rounded" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Reason</label>
                        <textarea
                          className="w-full p-2 border rounded h-20"
                          placeholder={
                            requestType === "timeoff" ? "Reason for time off..." : "Reason for rescheduling..."
                          }
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button type="submit">Submit Request</Button>
                        <Button type="button" variant="outline" onClick={() => setShowRequestForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Previous Requests */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Recent Requests</h4>
                  <div className="space-y-2">
                    <div className="p-3 border rounded flex justify-between items-center">
                      <div>
                        <p className="font-medium">Time Off Request</p>
                        <p className="text-sm text-gray-600">Jan 15-17, 2024 • Family emergency</p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <div className="p-3 border rounded flex justify-between items-center">
                      <div>
                        <p className="font-medium">Shift Reschedule</p>
                        <p className="text-sm text-gray-600">Jan 10 → Jan 12 • Medical appointment</p>
                      </div>
                      <Badge>Approved</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            {/* Schedule View */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  My Schedule
                </CardTitle>
                <CardDescription>Your upcoming shifts and schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingShifts.map((shift) => (
                    <div key={shift.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {new Date(shift.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {shift.startTime} - {shift.endTime}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{shift.status}</Badge>
                          <Button variant="ghost" size="sm">
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
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
