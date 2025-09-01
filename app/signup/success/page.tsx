'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Mail, ArrowRight, Building, Users, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function SignupSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState('')

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF8] to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to RotaClock!
            </h1>
            <p className="text-xl text-gray-600">
              Your organization has been created successfully
            </p>
          </div>

          {/* Success Card */}
          <Card className="mb-8">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <Building className="w-6 h-6 mr-2 text-blue-600" />
                Organization Setup Complete
              </CardTitle>
              <CardDescription>
                Your organization is now ready to use RotaCloud
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Add Employees</h3>
                  <p className="text-sm text-gray-600">Start building your team</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Create Shifts</h3>
                  <p className="text-sm text-gray-600">Schedule your workforce</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Track Time</h3>
                  <p className="text-sm text-gray-600">Monitor attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
              <CardDescription>
                Follow these steps to get started with your new organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Log in to your account</h4>
                  <p className="text-gray-600">
                    Use your admin credentials to access your organization dashboard
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Add your employees</h4>
                  <p className="text-gray-600">
                    Create employee accounts and set up their profiles
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Create your first schedule</h4>
                  <p className="text-gray-600">
                    Set up shifts and assign employees to work schedules
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">4</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Start tracking time</h4>
                  <p className="text-gray-600">
                    Employees can clock in/out and you can monitor attendance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trial Information */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2 text-orange-600" />
                Verify Your Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                We've sent a verification email to <strong>{email}</strong>. Please check your inbox and click the verification link to activate your account.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> You can still log in and use the system while your email is being verified.
                </p>
              </div>
            </CardContent>
          </Card>

                     {/* Trial Information */}
           <Card className="mb-8">
             <CardHeader>
               <CardTitle className="flex items-center">
                 <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
                 Free Trial Active
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-gray-600 mb-4">
                 Your organization is now on a <strong>30-day free trial</strong>. You have full access to all features during this period.
               </p>
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                 <p className="text-sm text-blue-800">
                   <strong>No credit card required</strong> - You can upgrade to a paid plan anytime during or after your trial.
                 </p>
               </div>
             </CardContent>
           </Card>

          {/* Action Buttons */}
          <div className="text-center space-y-4">
            <Link href="/login">
              <Button size="lg" className="w-full md:w-auto">
                Log in to Your Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Link href="/pricing">
                <Button variant="outline" size="lg">
                  View Pricing Plans
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg">
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
              Need help getting started?
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm">
              <Link href="/docs" className="text-blue-600 hover:text-blue-700">
                Documentation
              </Link>
              <Link href="/tutorials" className="text-blue-600 hover:text-blue-700">
                Video Tutorials
              </Link>
              <Link href="/contact" className="text-blue-600 hover:text-blue-700">
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
