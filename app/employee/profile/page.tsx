"use client"

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
import { Clock, LogOut, Camera, Save, Edit, Calendar, Shield, Settings, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface EmployeeProfile {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  hire_date: string
  hourly_rate: number
  max_hours_per_week: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Availability {
  id: string
  employee_id: string
  day_of_week: string
  start_time: string
  end_time: string
  is_available: boolean
  created_at: string
  updated_at: string
}

export default function EmployeeProfilePage() {
  const [employeeId, setEmployeeId] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [availability, setAvailability] = useState<Availability[]>([])
  const [tempProfile, setTempProfile] = useState<Partial<EmployeeProfile>>({})
  const [tempAvailability, setTempAvailability] = useState<Availability[]>([])

  useEffect(() => {
    const storedEmployeeId = localStorage.getItem("employeeId")
    if (!storedEmployeeId) {
      router.push("/employee/login")
    } else {
      setEmployeeId(storedEmployeeId)
      fetchProfile(storedEmployeeId)
      fetchAvailability(storedEmployeeId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const fetchProfile = async (id: string) => {
    try {
      const response = await fetch(`/api/employees/${id}/profile`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data.employee)
        setTempProfile(data.employee)
      } else {
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailability = async (id: string) => {
    try {
      const response = await fetch(`/api/employees/${id}/availability`)
      if (response.ok) {
        const data = await response.json()
        setAvailability(data.availability || [])
        setTempAvailability(data.availability || [])
      }
    } catch (error) {
      // ignore
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("employeeId")
    router.push("/employee/login")
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/employees/${profile.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tempProfile),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.employee)
        setTempProfile(data.employee)
        setIsEditing(false)
        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to update profile",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAvailability = async () => {
    if (!profile) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/employees/${profile.id}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability: tempAvailability }),
      })

      if (response.ok) {
        const data = await response.json()
        setAvailability(data.availability)
        setTempAvailability(data.availability)
        setIsEditing(false)
        toast({
          title: "Success",
          description: "Availability updated successfully",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to update availability",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (profile) {
      setTempProfile(profile)
    }
    setTempAvailability(availability)
    setIsEditing(false)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Not implemented
  }

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
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-3 text-lg">Loading profile...</span>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    <span className="text-3xl font-semibold text-gray-600">
                      {profile ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase() : 'U'}
                    </span>
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
                  <h1 className="text-3xl font-bold">{profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}</h1>
                  <p className="text-lg text-gray-600">{profile?.position || 'Loading...'}</p>
                  <p className="text-gray-600">{profile?.department || 'Loading...'}</p>
                  <p className="text-sm text-gray-500">Started: {profile ? new Date(profile.hire_date).toLocaleDateString() : 'Loading...'}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} disabled={loading}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button onClick={activeTab === 'availability' ? handleSaveAvailability : handleSaveProfile} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
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
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={tempProfile.first_name || ''}
                      onChange={(e) => setTempProfile({ ...tempProfile, first_name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={tempProfile.last_name || ''}
                      onChange={(e) => setTempProfile({ ...tempProfile, last_name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={tempProfile.email || ''}
                      onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input value={tempProfile.department || ''} disabled />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={tempProfile.position || ''}
                      onChange={(e) => setTempProfile({ ...tempProfile, position: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      value={tempProfile.hourly_rate || ''}
                      onChange={(e) => setTempProfile({ ...tempProfile, hourly_rate: parseFloat(e.target.value) || 0 })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="maxHours">Max Hours Per Week</Label>
                  <Input
                    id="maxHours"
                    type="number"
                    value={tempProfile.max_hours_per_week || ''}
                    onChange={(e) => setTempProfile({ ...tempProfile, max_hours_per_week: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                  />
                </div>
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
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                    const dayAvailability = tempAvailability.find(avail => avail.day_of_week === day) || {
                      day_of_week: day,
                      start_time: '09:00',
                      end_time: '17:00',
                      is_available: false
                    }
                    
                    return (
                      <div key={day} className="flex items-center space-x-4 p-3 border rounded-lg">
                        <div className="w-24">
                          <p className="font-medium capitalize">{day}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={dayAvailability.is_available}
                            onCheckedChange={(checked) => {
                              const updated = tempAvailability.map(avail => 
                                avail.day_of_week === day 
                                  ? { ...avail, is_available: checked }
                                  : avail
                              )
                              if (!updated.find(avail => avail.day_of_week === day)) {
                                updated.push({
                                  id: '',
                                  employee_id: profile?.id || '',
                                  day_of_week: day,
                                  start_time: '09:00',
                                  end_time: '17:00',
                                  is_available: checked,
                                  created_at: '',
                                  updated_at: ''
                                })
                              }
                              setTempAvailability(updated)
                            }}
                            disabled={!isEditing}
                          />
                          <span className="text-sm">Available</span>
                        </div>
                        {dayAvailability.is_available && (
                          <>
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm">From:</Label>
                              <Input
                                type="time"
                                value={dayAvailability.start_time}
                                onChange={(e) => {
                                  const updated = tempAvailability.map(avail => 
                                    avail.day_of_week === day 
                                      ? { ...avail, start_time: e.target.value }
                                      : avail
                                  )
                                  setTempAvailability(updated)
                                }}
                                disabled={!isEditing}
                                className="w-32"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm">To:</Label>
                              <Input
                                type="time"
                                value={dayAvailability.end_time}
                                onChange={(e) => {
                                  const updated = tempAvailability.map(avail => 
                                    avail.day_of_week === day 
                                      ? { ...avail, end_time: e.target.value }
                                      : avail
                                  )
                                  setTempAvailability(updated)
                                }}
                                disabled={!isEditing}
                                className="w-32"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive email notifications for important updates</p>
                    </div>
                    <Switch disabled={!isEditing} />
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">SMS Notifications</p>
                      <p className="text-sm text-gray-600">Receive SMS notifications for urgent matters</p>
                    </div>
                    <Switch disabled={!isEditing} />
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Shift Reminders</p>
                      <p className="text-sm text-gray-600">Get reminded before your shifts start</p>
                    </div>
                    <Switch disabled={!isEditing} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
