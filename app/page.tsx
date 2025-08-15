"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Users, Calendar, DollarSign, Shield, User } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">ShiftTracker</span>
            </div>
            <div className="flex space-x-2">
              <Link href="/employee/login">
                <Button variant="outline">Employee Login</Button>
              </Link>
              <Link href="/team-lead/login">
                <Button variant="secondary">Team Lead Login</Button>
              </Link>
              <Link href="/project-manager/login">
                <Button variant="secondary">PM Login</Button>
              </Link>
              <Link href="/admin/login">
                <Button>Admin Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">Streamline Your Workforce Management</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Complete employee shift management and time tracking solution. Empower your team with easy clock-in/out,
            break management, and comprehensive payroll tracking.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/admin/login">
              <Button size="lg" className="px-8 py-3">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/team-lead/login">
              <Button variant="outline" size="lg" className="px-8 py-3 bg-transparent">
                Team Lead Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need to Manage Your Team</h2>
            <p className="text-lg text-gray-600">Powerful features designed for both employees and administrators</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader>
                <Clock className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>Time Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Easy clock in/out with break management and real-time tracking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle>Shift Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Create, assign, and manage employee shifts with ease</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle>Employee Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Complete CRUD operations for employee profiles and data</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <DollarSign className="h-10 w-10 text-yellow-600 mb-2" />
                <CardTitle>Payroll Calculation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Automatic payroll calculation based on hours and rates</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Login Preview Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Three Powerful Portals</h2>
            <p className="text-lg text-gray-600">Separate interfaces designed for employees, team leads, and administrators</p>
          </div>

          <Tabs defaultValue="employee" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="employee" className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Employee Portal
              </TabsTrigger>
              <TabsTrigger value="teamlead" className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Team Lead Portal
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Admin Portal
              </TabsTrigger>
            </TabsList>
            <TabsContent value="teamlead" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Lead Features</CardTitle>
                  <CardDescription>Live monitoring, team management, quality and training</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Team Overview & Live</h4>
                      <p className="text-sm text-gray-600">Real-time presence and queue stats</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Performance & Quality</h4>
                      <p className="text-sm text-gray-600">Metrics, CSAT, FCR with charts</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Training & Communications</h4>
                      <p className="text-sm text-gray-600">Assign training and broadcast updates</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Role-based Access</h4>
                      <p className="text-sm text-gray-600">Scoped to your team only</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employee" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Employee Features</CardTitle>
                  <CardDescription>Everything employees need to manage their time and shifts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Secure Login</h4>
                      <p className="text-sm text-gray-600">Individual employee accounts</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Clock In/Out</h4>
                      <p className="text-sm text-gray-600">Simple time tracking interface</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Break Management</h4>
                      <p className="text-sm text-gray-600">Track breaks during shifts</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Personal Dashboard</h4>
                      <p className="text-sm text-gray-600">Hours worked and shift schedules</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Administrator Features</CardTitle>
                  <CardDescription>Complete management tools for workforce administration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Shift Assignment</h4>
                      <p className="text-sm text-gray-600">Create and manage employee shifts</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Employee Management</h4>
                      <p className="text-sm text-gray-600">Full CRUD operations for staff</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Payroll Calculation</h4>
                      <p className="text-sm text-gray-600">Automatic pay calculations</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">✓ Analytics & Reports</h4>
                      <p className="text-sm text-gray-600">Comprehensive workforce insights</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 mr-2" />
            <span className="text-lg font-semibold">ShiftTracker</span>
          </div>
          <p className="text-center text-gray-400 mt-4">© 2024 ShiftTracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
