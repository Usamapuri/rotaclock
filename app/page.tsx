"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Users, Calendar, CheckCircle, ArrowRight, ChevronDown, Search, Zap, MapPin, Star, Folder, Shield, TrendingUp, Smartphone, Globe } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF8] to-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center">
              <div className="relative w-10 h-10 mr-3">
                {/* RotaClock Logo - Enhanced circular design with clock elements */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center relative shadow-lg">
                  <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                    <div className="w-1 h-4 bg-blue-600 rounded-full transform rotate-45 origin-bottom"></div>
                  </div>
                  {/* Clock hands */}
                  <div className="absolute w-0.5 h-2.5 bg-blue-600 transform rotate-12 origin-bottom"></div>
                  <div className="absolute w-0.5 h-2 bg-blue-600 transform -rotate-45 origin-bottom"></div>
                </div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">RotaClock</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <div className="flex items-center space-x-1 cursor-pointer hover:text-blue-600 transition-colors">
                <span className="text-gray-700">Features</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex items-center space-x-1 cursor-pointer hover:text-blue-600 transition-colors">
                <span className="text-gray-700">Solutions</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
              <Link href="/pricing" className="flex items-center space-x-1 hover:text-blue-600 transition-colors">
                <span className="text-gray-700">Pricing</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Link>
              <div className="flex items-center space-x-1 cursor-pointer hover:text-blue-600 transition-colors">
                <span className="text-gray-700">Resources</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <Search className="h-5 w-5 text-gray-500 cursor-pointer hover:text-blue-600 transition-colors" />
              <Link href="/login">
                <Button variant="ghost" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4 mr-2" />
            Trusted by 10,000+ businesses worldwide
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
            Master Your Workforce
            <span className="block text-transparent bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text">
              Like Clockwork
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
            Transform your business with intelligent scheduling, seamless time tracking, and powerful HR tools. 
            <span className="font-semibold text-blue-600"> Everything you need to keep your team running smoothly.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-10 py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
                Start Your Free Trial
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="px-10 py-6 text-lg border-2 hover:bg-blue-50 transition-all duration-200">
                View Pricing
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-12 text-sm text-gray-600">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="font-medium">No credit card required</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="font-medium">14-day free trial</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="font-medium">Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-blue-600">10K+</div>
              <div className="text-gray-600">Active Businesses</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-blue-600">500K+</div>
              <div className="text-gray-600">Employees Managed</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-blue-600">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-blue-600">24/7</div>
              <div className="text-gray-600">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              See RotaClock in Action
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the power of intelligent scheduling with our interactive demo
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
            {/* Desktop Interface */}
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-white font-semibold text-lg">The Rope & Rock</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-1 bg-gray-700 rounded-lg p-1">
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md">Week</button>
                    <button className="px-4 py-2 text-gray-400 text-sm hover:text-white">Month</button>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">1 - 7 September 2025</span>
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700 text-sm shadow-lg">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Publish
                  </Button>
                </div>
              </div>
              
              {/* Enhanced Schedule Grid */}
              <div className="grid grid-cols-8 gap-3 text-sm">
                {/* Summary Column */}
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-lg">
                    <div className="text-blue-200 text-xs mb-1">Week 13 Summary</div>
                    <div className="text-white font-bold">915h 30m</div>
                    <div className="text-white font-bold">£13,732.50</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-lg">
                    <div className="text-orange-200 text-xs mb-1">Open Shifts</div>
                    <div className="text-white font-bold">80h (£1,017.00)</div>
                    <div className="text-white text-sm">8 shifts</div>
                  </div>
                </div>
                
                {/* Day Columns */}
                {['1 Monday', '2 Tuesday', '3 Wednesday', '4 Thursday', '5 Friday', '6 Saturday', '7 Sunday'].map((day, index) => (
                  <div key={day} className="space-y-2">
                    <div className="bg-gray-700 p-3 rounded-lg text-center">
                      <div className="text-gray-400 text-xs mb-1">{day}</div>
                      <div className="text-white font-bold">102h 0m</div>
                      <div className="text-white font-bold">£1,530.00</div>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded text-white text-xs font-medium">
                        4pm - 11pm Bar Staff x2
                      </div>
                      <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded text-white text-xs font-medium">
                        7am - 7pm Front Of House x2
                      </div>
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-2 rounded text-white text-xs font-medium">
                        12pm - 11pm Waiting Staff
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Overlay */}
            <div className="absolute top-6 right-6 w-56 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white shadow-xl">
              <div className="text-xs mb-2 opacity-80">Mon 8 Sep 2025</div>
              <div className="font-bold mb-3 text-lg">Good Morning, Robert</div>
              <div className="bg-blue-800 p-3 rounded-lg mb-3">
                <div className="text-xs text-blue-200 mb-1">Next shift today</div>
                <div className="font-bold text-lg">11:00 - 18:00</div>
                <div className="font-medium">Front of House</div>
                <div className="text-xs opacity-80">Rope & Rock</div>
              </div>
              <div className="text-xs opacity-90">
                Hey Robert, you will be the first one in today. Please speak with Emily when you arrive and she'll brief you on today's special events.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to 
              <span className="text-transparent bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text"> Run Your Business</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform combines intelligent scheduling, time tracking, and HR management to streamline your operations.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left Side - Features */}
            <div className="space-y-10">
              <div>
                <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
                  <Calendar className="h-4 w-4 mr-2" />
                  Smart Scheduling
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-6">Intelligent Rota Planning</h3>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Create perfect schedules in minutes with AI-powered suggestions, conflict detection, and automated optimization.
                </p>
                <div className="space-y-4">
                  {[
                    'Drag & drop scheduling',
                    'AI-powered optimization', 
                    'Conflict detection',
                    'Mobile app access',
                    'Real-time updates'
                  ].map((feature) => (
                    <div key={feature} className="flex items-center text-blue-600 font-medium text-lg hover:text-blue-700 transition-colors cursor-pointer group">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-4 group-hover:scale-150 transition-transform"></div>
                      {feature} 
                      <ArrowRight className="ml-3 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side - Enhanced Visual Demo */}
            <div className="relative">
              <div className="absolute -top-4 -right-4">
                <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-full shadow-lg">
                  <Zap className="h-5 w-5" />
                  <span className="font-semibold text-sm">BUILD ROTAS IN MINUTES</span>
                </div>
              </div>
              
              {/* Enhanced Shift Scheduling Grid */}
              <div className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-100">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {['13 Fri', '14 Sat', '15 Sun'].map((day) => (
                    <div key={day} className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg text-center text-sm font-semibold border">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {/* Column 1 */}
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-purple-100 to-purple-200 border-l-4 border-purple-500 p-3 rounded-lg shadow-sm">
                      <div className="text-sm font-bold text-purple-800">08:00 - 16:00</div>
                      <div className="text-xs text-purple-600">Supervisor</div>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 p-3 rounded-lg h-16 flex items-center justify-center">
                      <div className="text-gray-400 text-xs">Add Shift</div>
                    </div>
                    <div className="bg-gradient-to-r from-orange-100 to-orange-200 border-l-4 border-orange-500 p-3 rounded-lg shadow-sm">
                      <div className="text-sm font-bold text-orange-800">08:00 - 16:00</div>
                      <div className="text-xs text-orange-600">Porter</div>
                    </div>
                  </div>
                  
                  {/* Column 2 */}
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-gray-300 p-3 rounded-lg h-16 flex items-center justify-center">
                      <div className="text-gray-400 text-xs">Add Shift</div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-3 rounded-lg flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg font-bold">+</span>
                      </div>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 p-3 rounded-lg h-16 flex items-center justify-center">
                      <div className="text-gray-400 text-xs">Add Shift</div>
                    </div>
                  </div>
                  
                  {/* Column 3 */}
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-gray-300 p-3 rounded-lg h-16 flex items-center justify-center">
                      <div className="text-gray-400 text-xs">Add Shift</div>
                    </div>
                    <div className="bg-gradient-to-r from-green-100 to-green-200 border-l-4 border-green-500 p-3 rounded-lg shadow-lg transform translate-x-2 hover:scale-105 transition-transform">
                      <div className="text-sm font-bold text-green-800">08:00 - 16:00</div>
                      <div className="text-xs text-green-600">Bar Staff</div>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 p-3 rounded-lg h-16 flex items-center justify-center">
                      <div className="text-gray-400 text-xs">Add Shift</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center space-x-2 text-blue-600 font-semibold text-lg hover:text-blue-700 transition-colors cursor-pointer group">
                    <span>DRAG & DROP SCHEDULING</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Time & Attendance Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left Side - Features */}
            <div className="space-y-10">
              <div>
                <div className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium mb-4">
                  <Clock className="h-4 w-4 mr-2" />
                  Time Tracking
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-6">Seamless Time & Attendance</h3>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Track attendance, manage breaks, and generate accurate timesheets automatically. 
                  <span className="font-semibold text-green-600"> No more manual calculations.</span>
                </p>
                <div className="space-y-4">
                  {[
                    'Mobile clock-in app',
                    'GPS location tracking',
                    'Automatic timesheets',
                    'Break management',
                    'Payroll integration'
                  ].map((feature) => (
                    <div key={feature} className="flex items-center text-green-600 font-medium text-lg hover:text-green-700 transition-colors cursor-pointer group">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-4 group-hover:scale-150 transition-transform"></div>
                      {feature} 
                      <ArrowRight className="ml-3 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side - Enhanced Visual Elements */}
            <div className="space-y-8">
              {/* Mobile Clock-in UI */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl max-w-sm transform hover:scale-105 transition-transform">
                <div className="text-sm text-gray-600 mb-2">Thursday 16 July</div>
                <div className="text-xl font-bold mb-2">12:30pm - 6:30pm</div>
                <div className="text-sm text-gray-600 mb-4">Waiting Staff</div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-center py-3 rounded-lg font-semibold shadow-lg">
                  <Clock className="h-5 w-5 inline mr-2" />
                  Clock in →
                </div>
                <div className="w-1 h-12 bg-yellow-400 absolute right-4 top-4 rounded-full"></div>
              </div>

              {/* Enhanced Timesheet Table */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl">
                <div className="space-y-3 mb-6">
                  <div className="grid grid-cols-4 gap-3 text-xs font-semibold text-gray-600">
                    <span>Date</span>
                    <span>In</span>
                    <span>Out</span>
                    <span>Hours Paid</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Tue 14 Jul 2021</span>
                    <span className="flex items-center font-medium">06:07 <div className="w-2 h-2 bg-orange-500 ml-2 rounded-full"></div></span>
                    <span>12:11</span>
                    <span className="font-bold text-green-600">6.00</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Wed 15 Jul 2021</span>
                    <span>12:37</span>
                    <span className="flex items-center font-medium">18:30 <div className="w-2 h-2 bg-orange-500 ml-2 rounded-full"></div></span>
                    <span className="font-bold text-green-600">6.00 M</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-center py-3 rounded-lg font-semibold shadow-lg">
                  <TrendingUp className="h-5 w-5 inline mr-2" />
                  Go to payroll →
                </div>
              </div>

              {/* Integrations */}
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-600 mb-3">SEAMLESS INTEGRATIONS</div>
                <div className="flex items-center justify-center space-x-6">
                  <div className="bg-white px-6 py-3 rounded-lg font-bold shadow-md border">Sage</div>
                  <div className="bg-white px-6 py-3 rounded-lg font-bold shadow-md border">QuickBooks</div>
                  <div className="bg-white px-6 py-3 rounded-lg font-bold shadow-md border">Xero</div>
                </div>
              </div>

              {/* Mobile Feature */}
              <div className="flex items-center justify-center space-x-2 text-green-600 font-semibold text-lg">
                <Smartphone className="h-6 w-6" />
                <span>MOBILE & ON-SITE CLOCKING</span>
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HR Tools Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left Side - Features */}
            <div className="space-y-10">
              <div>
                <div className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium mb-4">
                  <Users className="h-4 w-4 mr-2" />
                  HR Management
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-6">Complete People Management</h3>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Manage your entire workforce from one platform. Track performance, handle leave requests, and maintain employee records effortlessly.
                </p>
                <div className="space-y-4">
                  {[
                    'Employee profiles',
                    'Leave management',
                    'Performance tracking',
                    'Document storage',
                    'Compliance tools'
                  ].map((feature) => (
                    <div key={feature} className="flex items-center text-purple-600 font-medium text-lg hover:text-purple-700 transition-colors cursor-pointer group">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mr-4 group-hover:scale-150 transition-transform"></div>
                      {feature} 
                      <ArrowRight className="ml-3 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side - Enhanced Visual Elements */}
            <div className="space-y-8">
              {/* Feature Highlight */}
              <div className="flex items-center justify-center space-x-2 text-purple-600 font-semibold text-lg mb-8">
                <Star className="h-6 w-6" />
                <span>EVERYTHING IN ONE PLACE</span>
              </div>

              {/* Enhanced Profile Cards */}
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-lg">Ronald Richards' Profile</span>
                      <div className="text-sm text-gray-600">Senior Team Member</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Folder className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-lg">Logbook Entries</span>
                      <div className="text-sm text-gray-600">Performance & Notes</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">R</span>
                    </div>
                    <span className="text-sm text-gray-600">rotaclock</span>
                    <Shield className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of businesses that trust RotaClock to manage their workforce efficiently. 
            Start your free trial today and see the difference.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
                Start Free Trial
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-10 py-6 text-lg font-semibold">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className="relative w-8 h-8 mr-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <div className="w-0.5 h-1.5 bg-blue-600 transform rotate-45 origin-bottom"></div>
                  </div>
                </div>
              </div>
              <span className="text-2xl font-bold">RotaClock</span>
            </div>
          </div>
          <div className="text-center text-gray-400 mb-8">
            <p className="text-lg mb-4">The complete workforce management solution</p>
            <div className="flex items-center justify-center space-x-6 text-sm">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Support</span>
              <span>Contact</span>
            </div>
          </div>
          <div className="text-center text-gray-500">
            <p>© 2024 RotaClock. All rights reserved. Made with ❤️ for modern businesses.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
