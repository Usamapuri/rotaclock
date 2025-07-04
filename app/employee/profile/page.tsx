"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, LogOut, Camera, Save, Edit, Calendar, Shield, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface EmployeeProfile {
  id: string
  name: string
  email: string
  phone: string
  department: string
  position: string
  startDate: string
  profilePicture?: string
  about: string
  skills: string[]
  preferences: {
    theme: "light" | "dark" | "system"
    notifications: {
      scheduleChanges: boolean
      shiftReminders: boolean
      messages: boolean
      announcements: boolean
    }
    dashboard: {
      showUpcomingShifts: boolean
      showHoursSummary: boolean
      showMessages: boolean
      showLeaveBalance: boolean
    }
  }
  availability: {
    [key: string]: { start: string; end: string; available: boolean }
  }
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
}

export default function EmployeeProfile() {
  const [employeeId, setEmployeeId] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const [profile, setProfile] = useState<EmployeeProfile>({
    id: "001",
    name: "John Doe",
    email: "john@company.com",
    phone: "+1-555-0123",
    department: "Sales",
    position: "Sales Associate",
    startDate: "2023-06-15",
    about:
      "Experienced sales professional with excellent customer service skills. I enjoy working with customers and helping them find the right solutions for their needs.",
    skills: ["Customer Service", "Sales", "Communication", "Problem Solving"],
    preferences: {
      theme: "light",
      notifications: {
        scheduleChanges: true,
        shiftReminders: true,
        messages: true,
        announcements: true,
      },
      dashboard: {
        showUpcomingShifts: true,
        showHoursSummary: true,
        showMessages: true,
        showLeaveBalance: true,
      },
    },
    availability: {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: true },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "17:00", available: true },
      saturday: { start: "10:00", end: "14:00", available: false },
      sunday: { start: "10:00", end: "14:00", available: false },
    },
    emergencyContact: {
      name: "Jane Doe",
      phone: "+1-555-0124",
      relationship: "Spouse",
    },
  })

  const [tempProfile, setTempProfile] = useState<EmployeeProfile>(profile)

  useEffect(() => {
    const storedEmployeeId = localStorage.getItem("employeeId")
    if (!storedEmployeeId) {
      router.push("/employee/login")
    } else {
      setEmployeeId(storedEmployeeId)
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("employeeId")
    router.push("/employee/login")
  }

  const handleSaveProfile = () => {
    setProfile(tempProfile)
    setIsEditing(false)
    // In a real app, this would save to an API
    console.log("Profile saved:", tempProfile)
  }

  const handleCancelEdit = () => {
    setTempProfile(profile)
    setIsEditing(false)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setTempProfile({ ...tempProfile, profilePicture: imageUrl })
      }
      reader.readAsDataURL(file)
    }
  }

  const addSkill = (skill: string) => {
    if (skill && !tempProfile.skills.includes(skill)) {
      setTempProfile({
        ...tempProfile,
        skills: [...tempProfile.skills, skill],
      })
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setTempProfile({
      ...tempProfile,
      skills: tempProfile.skills.filter((skill) => skill !== skillToRemove),
    })
  }

  const updateAvailability = (day: string, field: "start" | "end" | "available", value: string | boolean) => {
    setTempProfile({
      ...tempProfile,
      availability: {
        ...tempProfile.availability,
        [day]: {
          ...tempProfile.availability[day],
          [field]: value,
        },
      },
    })
  }

  const updateNotificationPreference = (key: keyof typeof tempProfile.preferences.notifications, value: boolean) => {
    setTempProfile({
      ...tempProfile,
      preferences: {
        ...tempProfile.preferences,
        notifications: {
          ...tempProfile.preferences.notifications,
          [key]: value,
        },
      },
    })
  }

  const updateDashboardPreference = (key: keyof typeof tempProfile.preferences.dashboard, value: boolean) => {
    setTempProfile({
      ...tempProfile,
      preferences: {
        ...tempProfile.preferences,
        dashboard: {
          ...tempProfile.preferences.dashboard,
          [key]: value,
        },
      },
    })
  }

  const skillOptions = [
    "Customer Service",
    "Sales",
    "Communication",
    "Problem Solving",
    "Technical Support",
    "Management",
    "Leadership",
    "Teamwork",
    "Time Management",
    "Organization",
  ]

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
              <Badge variant="outline">My Profile</Badge>
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
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {tempProfile.profilePicture ? (
                      <img
                        src={tempProfile.profilePicture || "/placeholder.svg"}
                        alt={tempProfile.name}
                        className="w-24 h-24 object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-semibold text-gray-600">
                        {tempProfile.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{profile.name}</h1>
                  <p className="text-lg text-gray-600">{profile.position}</p>
                  <p className="text-gray-600">{profile.department}</p>
                  <p className="text-sm text-gray-500">Started: {new Date(profile.startDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleSaveProfile}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={tempProfile.name}
                      onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={tempProfile.email}
                      onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={tempProfile.phone}
                      onChange={(e) => setTempProfile({ ...tempProfile, phone: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input value={tempProfile.department} disabled />
                  </div>
                </div>

                <div>
                  <Label htmlFor="about">About Me</Label>
                  <Textarea
                    id="about"
                    value={tempProfile.about}
                    onChange={(e) => setTempProfile({ ...tempProfile, about: e.target.value })}
                    disabled={!isEditing}
                    className="min-h-[100px]"
                    placeholder="Tell us about yourself, your experience, and interests..."
                  />
                </div>

                <div>
                  <Label>Skills</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-3">
                    {tempProfile.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        {isEditing && (
                          <button onClick={() => removeSkill(skill)} className="ml-1 text-xs hover:text-red-600">
                            ×
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  {isEditing && (
                    <Select onValueChange={addSkill}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add a skill" />
                      </SelectTrigger>
                      <SelectContent>
                        {skillOptions
                          .filter((skill) => !tempProfile.skills.includes(skill))
                          .map((skill) => (
                            <SelectItem key={skill} value={skill}>
                              {skill}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
                <CardDescription>Person to contact in case of emergency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyName">Contact Name</Label>
                    <Input
                      id="emergencyName"
                      value={tempProfile.emergencyContact.name}
                      onChange={(e) =>
                        setTempProfile({
                          ...tempProfile,
                          emergencyContact: { ...tempProfile.emergencyContact, name: e.target.value },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone">Phone</Label>
                    <Input
                      id="emergencyPhone"
                      value={tempProfile.emergencyContact.phone}
                      onChange={(e) =>
                        setTempProfile({
                          ...tempProfile,
                          emergencyContact: { ...tempProfile.emergencyContact, phone: e.target.value },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="emergencyRelationship">Relationship</Label>
                  <Input
                    id="emergencyRelationship"
                    value={tempProfile.emergencyContact.relationship}
                    onChange={(e) =>
                      setTempProfile({
                        ...tempProfile,
                        emergencyContact: { ...tempProfile.emergencyContact, relationship: e.target.value },
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="availability" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Availability</CardTitle>
                <CardDescription>Set your preferred working hours for each day of the week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(tempProfile.availability).map(([day, avail]) => (
                    <div key={day} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <div className="w-24">
                        <p className="font-medium capitalize">{day}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={avail.available}
                          onCheckedChange={(checked) => updateAvailability(day, "available", checked)}
                          disabled={!isEditing}
                        />
                        <span className="text-sm">Available</span>
                      </div>
                      {avail.available && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Label className="text-sm">From:</Label>
                            <Input
                              type="time"
                              value={avail.start}
                              onChange={(e) => updateAvailability(day, "start", e.target.value)}
                              disabled={!isEditing}
                              className="w-32"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label className="text-sm">To:</Label>
                            <Input
                              type="time"
                              value={avail.end}
                              onChange={(e) => updateAvailability(day, "end", e.target.value)}
                              disabled={!isEditing}
                              className="w-32"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Schedule Changes</p>
                    <p className="text-sm text-gray-600">Get notified when your schedule is updated</p>
                  </div>
                  <Switch
                    checked={tempProfile.preferences.notifications.scheduleChanges}
                    onCheckedChange={(checked) => updateNotificationPreference("scheduleChanges", checked)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Shift Reminders</p>
                    <p className="text-sm text-gray-600">Receive reminders before your shifts start</p>
                  </div>
                  <Switch
                    checked={tempProfile.preferences.notifications.shiftReminders}
                    onCheckedChange={(checked) => updateNotificationPreference("shiftReminders", checked)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Messages</p>
                    <p className="text-sm text-gray-600">Get notified about new team messages</p>
                  </div>
                  <Switch
                    checked={tempProfile.preferences.notifications.messages}
                    onCheckedChange={(checked) => updateNotificationPreference("messages", checked)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Announcements</p>
                    <p className="text-sm text-gray-600">Receive company announcements and updates</p>
                  </div>
                  <Switch
                    checked={tempProfile.preferences.notifications.announcements}
                    onCheckedChange={(checked) => updateNotificationPreference("announcements", checked)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dashboard Preferences</CardTitle>
                <CardDescription>Customize what appears on your dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Upcoming Shifts</p>
                    <p className="text-sm text-gray-600">Show your upcoming shifts on the dashboard</p>
                  </div>
                  <Switch
                    checked={tempProfile.preferences.dashboard.showUpcomingShifts}
                    onCheckedChange={(checked) => updateDashboardPreference("showUpcomingShifts", checked)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Hours Summary</p>
                    <p className="text-sm text-gray-600">Display your hours worked summary</p>
                  </div>
                  <Switch
                    checked={tempProfile.preferences.dashboard.showHoursSummary}
                    onCheckedChange={(checked) => updateDashboardPreference("showHoursSummary", checked)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Messages</p>
                    <p className="text-sm text-gray-600">Show recent messages on the dashboard</p>
                  </div>
                  <Switch
                    checked={tempProfile.preferences.dashboard.showMessages}
                    onCheckedChange={(checked) => updateDashboardPreference("showMessages", checked)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Leave Balance</p>
                    <p className="text-sm text-gray-600">Display your remaining leave days</p>
                  </div>
                  <Switch
                    checked={tempProfile.preferences.dashboard.showLeaveBalance}
                    onCheckedChange={(checked) => updateDashboardPreference("showLeaveBalance", checked)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Theme Preferences</CardTitle>
                <CardDescription>Choose your preferred theme</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={tempProfile.preferences.theme}
                    onValueChange={(value: "light" | "dark" | "system") =>
                      setTempProfile({
                        ...tempProfile,
                        preferences: { ...tempProfile.preferences, theme: value },
                      })
                    }
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Change Password</p>
                      <p className="text-sm text-gray-600">Update your account password</p>
                    </div>
                    <Button variant="outline">
                      <Shield className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Setup 2FA
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Login History</p>
                      <p className="text-sm text-gray-600">View your recent login activity</p>
                    </div>
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      View History
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
