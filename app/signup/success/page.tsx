'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Mail, ArrowRight, Building2, Clock } from 'lucide-react'
import Link from 'next/link'

export default function SignupSuccessPage() {
  const searchParams = useSearchParams()
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
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-amber-700" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Application received</h1>
            <p className="text-xl text-gray-600">
              Thanks for registering with RotaClock. Your company signup is pending review by our team.
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <Building2 className="w-6 h-6 mr-2 text-blue-600" />
                What happens next
              </CardTitle>
              <CardDescription>
                A platform administrator will review your application. You will receive an email when your workspace is
                approved and your admin account is activated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                Until approval, you <strong>cannot</strong> log in yet. If you have questions, use the contact link
                below.
              </p>
              {email ? (
                <p className="text-sm bg-slate-50 border rounded-lg p-3">
                  <Mail className="inline w-4 h-4 mr-1 text-slate-600 align-text-bottom" />
                  We will notify <strong>{email}</strong> once your organization is ready.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                After you are approved
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-600 space-y-2 text-sm">
              <p>Your trial will start when the workspace is created. You can then add locations, employees, and schedules.</p>
            </CardContent>
          </Card>

          <div className="text-center space-y-4">
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full md:w-auto">
                Back to sign in
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4">
              <Link href="/pricing">
                <Button variant="ghost" size="lg">
                  View pricing
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="ghost" size="lg">
                  Contact support
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
