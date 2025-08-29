"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Users, Calendar, CheckCircle, ArrowRight, ChevronDown, Search, Zap, MapPin, Star, Folder } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF8]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center">
              <div className="relative w-8 h-8 mr-3">
                {/* Rotaclock Logo - Circular design with clock elements */}
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center relative">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <div className="w-1 h-3 bg-blue-600 rounded-full transform rotate-45 origin-bottom"></div>
                  </div>
                  {/* Clock hands */}
                  <div className="absolute w-0.5 h-2 bg-blue-600 transform rotate-12 origin-bottom"></div>
                  <div className="absolute w-0.5 h-1.5 bg-blue-600 transform -rotate-45 origin-bottom"></div>
                </div>
              </div>
              <span className="text-xl font-bold text-blue-600">rotaclock</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <div className="flex items-center space-x-1 cursor-pointer">
                <span className="text-gray-700">Features</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex items-center space-x-1 cursor-pointer">
                <span className="text-gray-700">Customers</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex items-center space-x-1 cursor-pointer">
                <span className="text-gray-700">Pricing</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex items-center space-x-1 cursor-pointer">
                <span className="text-gray-700">Resources</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <Search className="h-5 w-5 text-gray-500 cursor-pointer" />
              <Link href="/login">
                <Button variant="ghost" className="text-gray-700">Log in</Button>
              </Link>
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700">Try it free</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-600 mb-4">Online rota software</p>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Fuss-free rota planning software for your business
            <span className="inline-flex items-center ml-2 px-3 py-1 bg-gray-100 rounded-full text-sm font-normal">
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              free
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Stop spending time on repetitive admin. Rotaclock brings your rotas, annual leave and timesheets together in one incredibly easy-to-use system.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
            <Link href="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 py-4 text-lg">
                Start your free trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-8 text-sm text-gray-600">
            <span>Already a Rotaclock user? <Link href="/login" className="text-blue-600 hover:underline">Log in</Link></span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span>No card required</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-900 rounded-lg p-6 relative overflow-hidden">
            {/* Desktop Interface */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-semibold">The Rope & Rock</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-1">
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded">Week</button>
                    <button className="px-3 py-1 text-gray-400 text-sm">Month</button>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                    <span className="text-sm">1 - 7 September 2025</span>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700 text-sm">Publish</Button>
                </div>
              </div>
              
              {/* Schedule Grid */}
              <div className="grid grid-cols-8 gap-2 text-xs">
                {/* Summary Column */}
                <div className="space-y-2">
                  <div className="bg-gray-700 p-2 rounded">
                    <div className="text-gray-400">Week 13 summary</div>
                    <div className="text-white">H 915h 30m</div>
                    <div className="text-white">C £13,732.50</div>
                  </div>
                  <div className="bg-gray-700 p-2 rounded">
                    <div className="text-gray-400">Open Shifts</div>
                    <div className="text-white">80h (£1,017.00)</div>
                    <div className="text-white">8 shifts</div>
                  </div>
                </div>
                
                {/* Day Columns */}
                {['1 Monday', '2 Tuesday', '3 Wednesday', '4 Thursday', '5 Friday', '6 Saturday', '7 Sunday'].map((day, index) => (
                  <div key={day} className="space-y-1">
                    <div className="bg-gray-700 p-1 rounded text-center">
                      <div className="text-gray-400">{day}</div>
                      <div className="text-white">102h 0m</div>
                      <div className="text-white">£1,530.00</div>
                    </div>
                    <div className="space-y-1">
                      <div className="bg-blue-600 p-1 rounded text-white text-xs">
                        4pm - 11pm Bar Staff x2
                      </div>
                      <div className="bg-green-600 p-1 rounded text-white text-xs">
                        7am - 7pm Front Of House x2
                      </div>
                      <div className="bg-orange-500 p-1 rounded text-white text-xs">
                        12pm - 11pm Waiting Staff
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Overlay */}
            <div className="absolute top-4 right-4 w-48 bg-blue-600 rounded-lg p-3 text-white">
              <div className="text-xs mb-2">Mon 8 Sep 2025</div>
              <div className="font-semibold mb-2">Good Morning, Robert</div>
              <div className="bg-blue-700 p-2 rounded mb-2">
                <div className="text-xs text-blue-200">Next shift today</div>
                <div className="font-semibold">11:00 - 18:00</div>
                <div>Front of House</div>
                <div className="text-xs">Rope & Rock</div>
              </div>
              <div className="text-xs">
                Hey Robert, you will be the first one in today. Please speak with Emily when you arrive and she...
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#FDFBF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">One simple platform for organising shift work</h2>
            <p className="text-xl text-gray-600">Our cloud-based Rota Planning, Time & Attendance and HR tools work hand in hand to save you time and money.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Features */}
            <div className="space-y-8">
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-2">Staff scheduling</p>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Rota planning</h3>
                <p className="text-lg text-gray-600 mb-6">Everything you need to organise your team, manage leave, and keep tabs on spending.</p>
                <div className="space-y-3">
                  {['Shift planning', 'Labour cost control', 'Sharing rotas', 'Mobile app', 'Availability tools'].map((feature) => (
                    <div key={feature} className="flex items-center text-blue-600 font-medium">
                      {feature} <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side - Visual Demo */}
            <div className="relative">
              <div className="absolute top-0 right-0">
                <div className="flex items-center space-x-2 bg-blue-100 px-3 py-2 rounded-full">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-600 font-semibold text-sm">BUILD ROTAS IN RECORD TIME</span>
                </div>
              </div>
              
              {/* Shift Scheduling Grid */}
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {['13 Fri', '14 Sat', '15 Sun'].map((day) => (
                    <div key={day} className="bg-gray-100 p-2 rounded text-center text-sm font-medium">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {/* Column 1 */}
                  <div className="space-y-2">
                    <div className="bg-purple-100 border-l-4 border-purple-500 p-2 rounded">
                      <div className="text-sm font-medium">08:00 - 16:00</div>
                      <div className="text-xs text-gray-600">Supervisor</div>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 p-2 rounded h-12"></div>
                    <div className="bg-orange-100 border-l-4 border-orange-500 p-2 rounded">
                      <div className="text-sm font-medium">08:00 - 16:00</div>
                      <div className="text-xs text-gray-600">Porter</div>
                    </div>
                  </div>
                  
                  {/* Column 2 */}
                  <div className="space-y-2">
                    <div className="border-2 border-dashed border-gray-300 p-2 rounded h-12"></div>
                    <div className="bg-blue-100 p-2 rounded flex items-center justify-center">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">+</span>
                      </div>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 p-2 rounded h-12"></div>
                  </div>
                  
                  {/* Column 3 */}
                  <div className="space-y-2">
                    <div className="border-2 border-dashed border-gray-300 p-2 rounded h-12"></div>
                    <div className="bg-green-100 border-l-4 border-green-500 p-2 rounded transform translate-x-2 shadow-lg">
                      <div className="text-sm font-medium">08:00 - 16:00</div>
                      <div className="text-xs text-gray-600">Bar Staff</div>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 p-2 rounded h-12"></div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center space-x-2 text-blue-600 font-medium">
                    <span>EASY DRAG AND DROP</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Time & Attendance Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Features */}
            <div className="space-y-8">
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-2">Time & Attendance</p>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Clocking in & timesheets</h3>
                <p className="text-lg text-gray-600 mb-6">The easy way to record staff attendance and track lateness across your team.</p>
                <div className="space-y-3">
                  {['Clocking in app', 'Automatic timesheets', 'Payroll & integrations'].map((feature) => (
                    <div key={feature} className="flex items-center text-blue-600 font-medium">
                      {feature} <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side - Visual Elements */}
            <div className="space-y-6">
              {/* Mobile Clock-in UI */}
              <div className="bg-white border rounded-lg p-4 shadow-lg max-w-xs">
                <div className="text-sm text-gray-600 mb-2">Thursday 16 July</div>
                <div className="text-lg font-semibold mb-2">12:30pm - 6:30pm</div>
                <div className="text-sm text-gray-600 mb-4">Waiting Staff</div>
                <div className="bg-teal-500 text-white text-center py-2 rounded font-medium">
                  Clock in →
                </div>
                <div className="w-1 h-8 bg-yellow-400 absolute right-2 top-2 rounded"></div>
              </div>

              {/* Timesheet Table */}
              <div className="bg-white border rounded-lg p-4 shadow-lg">
                <div className="space-y-2 mb-4">
                  <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600">
                    <span>Date</span>
                    <span>In</span>
                    <span>Out</span>
                    <span>Hours Paid</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <span>Tue 14 Jul 2021</span>
                    <span className="flex items-center">06:07 <div className="w-2 h-2 bg-orange-500 ml-1 rounded-full"></div></span>
                    <span>12:11</span>
                    <span>6.00</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <span>Wed 15 Jul 2021</span>
                    <span>12:37</span>
                    <span className="flex items-center">18:30 <div className="w-2 h-2 bg-orange-500 ml-1 rounded-full"></div></span>
                    <span>6.00 M</span>
                  </div>
                </div>
                <div className="bg-teal-500 text-white text-center py-2 rounded font-medium">
                  Go to payroll →
                </div>
              </div>

              {/* Integrations */}
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-600 mb-2">INTEGRATES WITH</div>
                <div className="flex items-center justify-center space-x-4">
                  <div className="bg-gray-100 px-4 py-2 rounded font-semibold">sage</div>
                  <div className="bg-gray-100 px-4 py-2 rounded font-semibold">staffology by IRIS</div>
                </div>
              </div>

              {/* Illustration */}
              <div className="flex items-center justify-center space-x-2 text-blue-600 font-medium">
                <MapPin className="h-5 w-5" />
                <span>MOBILE AND ON-SITE CLOCKING IN</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HR Tools Section */}
      <section className="py-20 bg-[#FDFBF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Features */}
            <div className="space-y-8">
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-2">HR tools</p>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">People management</h3>
              </div>
            </div>

            {/* Right Side - Visual Elements */}
            <div className="space-y-6">
              {/* Illustration */}
              <div className="flex items-center justify-center space-x-2 text-blue-600 font-medium mb-6">
                <Star className="h-5 w-5" />
                <span>EVERYTHING IN ONE PLACE</span>
              </div>

              {/* Profile Cards */}
              <div className="space-y-4">
                <div className="bg-white border rounded-lg p-4 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-gray-600" />
                    </div>
                    <span className="font-medium">Ronald Richards' profile</span>
                  </div>
                </div>
                
                <div className="bg-white border rounded-lg p-4 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Folder className="h-4 w-4 text-gray-600" />
                    </div>
                    <span className="font-medium">Logbook Entries</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">r</span>
                    </div>
                    <span className="text-sm text-gray-600">rotaclock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center">
              <div className="relative w-6 h-6 mr-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <div className="w-0.5 h-2 bg-blue-600 transform rotate-45 origin-bottom"></div>
                  </div>
                </div>
              </div>
              <span className="text-lg font-semibold">rotaclock</span>
            </div>
          </div>
          <p className="text-center text-gray-400">© 2024 Rotaclock. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
