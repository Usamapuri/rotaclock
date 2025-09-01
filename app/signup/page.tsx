'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Check, Building, User, Mail, Phone, MapPin, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    // Organization details
    organizationName: '',
    organizationEmail: '',
    organizationPhone: '',
    organizationAddress: '',
    organizationCity: '',
    organizationState: '',
    organizationCountry: 'Pakistan',
    organizationIndustry: '',
    organizationSize: '',
    
    // Admin details
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    adminConfirmPassword: '',
    
    // Plan selection
    selectedPlan: 'starter'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$2',
      description: 'Perfect for small teams',
      features: ['Up to 10 employees', 'Basic features', 'Email support']
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$5',
      description: 'Ideal for growing businesses',
      features: ['Up to 50 employees', 'Advanced features', 'Priority support']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$10',
      description: 'For large organizations',
      features: ['Unlimited employees', 'All features', 'Dedicated support']
    }
  ]

  const industries = [
    'Technology',
    'Healthcare',
    'Retail',
    'Manufacturing',
    'Education',
    'Finance',
    'Real Estate',
    'Hospitality',
    'Transportation',
    'Other'
  ]

  const companySizes = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '500+ employees'
  ]

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!formData.organizationName) newErrors.organizationName = 'Organization name is required'
      if (!formData.organizationEmail) newErrors.organizationEmail = 'Organization email is required'
      if (!formData.organizationPhone) newErrors.organizationPhone = 'Organization phone is required'
      if (!formData.organizationIndustry) newErrors.organizationIndustry = 'Industry is required'
      if (!formData.organizationSize) newErrors.organizationSize = 'Company size is required'
    }

    if (currentStep === 2) {
      if (!formData.adminFirstName) newErrors.adminFirstName = 'First name is required'
      if (!formData.adminLastName) newErrors.adminLastName = 'Last name is required'
      if (!formData.adminEmail) newErrors.adminEmail = 'Email is required'
      if (!formData.adminPhone) newErrors.adminPhone = 'Phone is required'
      if (!formData.adminPassword) newErrors.adminPassword = 'Password is required'
      if (formData.adminPassword.length < 8) newErrors.adminPassword = 'Password must be at least 8 characters'
      if (formData.adminPassword !== formData.adminConfirmPassword) {
        newErrors.adminConfirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handlePrevious = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(step)) return

    try {
      // TODO: Implement organization signup API call
      console.log('Submitting organization signup:', formData)
      
      // For now, just redirect to login
      router.push('/login?message=signup-success')
    } catch (error) {
      console.error('Signup error:', error)
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create Your Organization
            </h1>
            <p className="text-gray-600">
              Get started with RotaCloud in just a few steps
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step > stepNumber ? <Check className="w-4 h-4" /> : stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      step > stepNumber ? 'bg-blue-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {step === 1 && <Building className="w-5 h-5 mr-2" />}
                    {step === 2 && <User className="w-5 h-5 mr-2" />}
                    {step === 3 && <Check className="w-5 h-5 mr-2" />}
                    {step === 1 && 'Organization Details'}
                    {step === 2 && 'Admin Account'}
                    {step === 3 && 'Choose Plan'}
                  </CardTitle>
                  <CardDescription>
                    {step === 1 && 'Tell us about your organization'}
                    {step === 2 && 'Create your admin account'}
                    {step === 3 && 'Select the perfect plan for your needs'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Step 1: Organization Details */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="organizationName">Organization Name *</Label>
                          <Input
                            id="organizationName"
                            value={formData.organizationName}
                            onChange={(e) => updateFormData('organizationName', e.target.value)}
                            placeholder="Enter organization name"
                            className={errors.organizationName ? 'border-red-500' : ''}
                          />
                          {errors.organizationName && (
                            <p className="text-red-500 text-sm mt-1">{errors.organizationName}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="organizationEmail">Organization Email *</Label>
                          <Input
                            id="organizationEmail"
                            type="email"
                            value={formData.organizationEmail}
                            onChange={(e) => updateFormData('organizationEmail', e.target.value)}
                            placeholder="admin@company.com"
                            className={errors.organizationEmail ? 'border-red-500' : ''}
                          />
                          {errors.organizationEmail && (
                            <p className="text-red-500 text-sm mt-1">{errors.organizationEmail}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="organizationPhone">Phone Number *</Label>
                          <Input
                            id="organizationPhone"
                            value={formData.organizationPhone}
                            onChange={(e) => updateFormData('organizationPhone', e.target.value)}
                            placeholder="+92 300 1234567"
                            className={errors.organizationPhone ? 'border-red-500' : ''}
                          />
                          {errors.organizationPhone && (
                            <p className="text-red-500 text-sm mt-1">{errors.organizationPhone}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="organizationIndustry">Industry *</Label>
                          <Select value={formData.organizationIndustry} onValueChange={(value) => updateFormData('organizationIndustry', value)}>
                            <SelectTrigger className={errors.organizationIndustry ? 'border-red-500' : ''}>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              {industries.map((industry) => (
                                <SelectItem key={industry} value={industry}>
                                  {industry}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.organizationIndustry && (
                            <p className="text-red-500 text-sm mt-1">{errors.organizationIndustry}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="organizationSize">Company Size *</Label>
                        <Select value={formData.organizationSize} onValueChange={(value) => updateFormData('organizationSize', value)}>
                          <SelectTrigger className={errors.organizationSize ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                          <SelectContent>
                            {companySizes.map((size) => (
                              <SelectItem key={size} value={size}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.organizationSize && (
                          <p className="text-red-500 text-sm mt-1">{errors.organizationSize}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="organizationAddress">Address</Label>
                        <Textarea
                          id="organizationAddress"
                          value={formData.organizationAddress}
                          onChange={(e) => updateFormData('organizationAddress', e.target.value)}
                          placeholder="Enter organization address"
                          rows={3}
                        />
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="organizationCity">City</Label>
                          <Input
                            id="organizationCity"
                            value={formData.organizationCity}
                            onChange={(e) => updateFormData('organizationCity', e.target.value)}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Label htmlFor="organizationState">State/Province</Label>
                          <Input
                            id="organizationState"
                            value={formData.organizationState}
                            onChange={(e) => updateFormData('organizationState', e.target.value)}
                            placeholder="State"
                          />
                        </div>
                        <div>
                          <Label htmlFor="organizationCountry">Country</Label>
                          <Input
                            id="organizationCountry"
                            value={formData.organizationCountry}
                            onChange={(e) => updateFormData('organizationCountry', e.target.value)}
                            placeholder="Country"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Admin Account */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="adminFirstName">First Name *</Label>
                          <Input
                            id="adminFirstName"
                            value={formData.adminFirstName}
                            onChange={(e) => updateFormData('adminFirstName', e.target.value)}
                            placeholder="Enter first name"
                            className={errors.adminFirstName ? 'border-red-500' : ''}
                          />
                          {errors.adminFirstName && (
                            <p className="text-red-500 text-sm mt-1">{errors.adminFirstName}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="adminLastName">Last Name *</Label>
                          <Input
                            id="adminLastName"
                            value={formData.adminLastName}
                            onChange={(e) => updateFormData('adminLastName', e.target.value)}
                            placeholder="Enter last name"
                            className={errors.adminLastName ? 'border-red-500' : ''}
                          />
                          {errors.adminLastName && (
                            <p className="text-red-500 text-sm mt-1">{errors.adminLastName}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="adminEmail">Email *</Label>
                          <Input
                            id="adminEmail"
                            type="email"
                            value={formData.adminEmail}
                            onChange={(e) => updateFormData('adminEmail', e.target.value)}
                            placeholder="admin@company.com"
                            className={errors.adminEmail ? 'border-red-500' : ''}
                          />
                          {errors.adminEmail && (
                            <p className="text-red-500 text-sm mt-1">{errors.adminEmail}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="adminPhone">Phone *</Label>
                          <Input
                            id="adminPhone"
                            value={formData.adminPhone}
                            onChange={(e) => updateFormData('adminPhone', e.target.value)}
                            placeholder="+92 300 1234567"
                            className={errors.adminPhone ? 'border-red-500' : ''}
                          />
                          {errors.adminPhone && (
                            <p className="text-red-500 text-sm mt-1">{errors.adminPhone}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="adminPassword">Password *</Label>
                          <Input
                            id="adminPassword"
                            type="password"
                            value={formData.adminPassword}
                            onChange={(e) => updateFormData('adminPassword', e.target.value)}
                            placeholder="Create a strong password"
                            className={errors.adminPassword ? 'border-red-500' : ''}
                          />
                          {errors.adminPassword && (
                            <p className="text-red-500 text-sm mt-1">{errors.adminPassword}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="adminConfirmPassword">Confirm Password *</Label>
                          <Input
                            id="adminConfirmPassword"
                            type="password"
                            value={formData.adminConfirmPassword}
                            onChange={(e) => updateFormData('adminConfirmPassword', e.target.value)}
                            placeholder="Confirm your password"
                            className={errors.adminConfirmPassword ? 'border-red-500' : ''}
                          />
                          {errors.adminConfirmPassword && (
                            <p className="text-red-500 text-sm mt-1">{errors.adminConfirmPassword}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Plan Selection */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        {plans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              formData.selectedPlan === plan.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => updateFormData('selectedPlan', plan.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  formData.selectedPlan === plan.id
                                    ? 'border-blue-500 bg-blue-500'
                                    : 'border-gray-300'
                                }`}>
                                  {formData.selectedPlan === plan.id && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                                  <p className="text-sm text-gray-600">{plan.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">{plan.price}</div>
                                <div className="text-sm text-gray-600">per month</div>
                              </div>
                            </div>
                            <div className="mt-3">
                              <ul className="text-sm text-gray-600 space-y-1">
                                {plan.features.map((feature, index) => (
                                  <li key={index} className="flex items-center">
                                    <Check className="w-4 h-4 text-green-500 mr-2" />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={step === 1}
                    >
                      Previous
                    </Button>
                    
                    {step < 3 ? (
                      <Button onClick={handleNext} className="flex items-center">
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button onClick={handleSubmit} className="flex items-center">
                        Create Organization
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {step >= 1 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Organization</h4>
                      <p className="text-sm text-gray-600">{formData.organizationName || 'Not specified'}</p>
                      <p className="text-sm text-gray-600">{formData.organizationEmail || 'Not specified'}</p>
                    </div>
                  )}
                  
                  {step >= 2 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Admin</h4>
                      <p className="text-sm text-gray-600">
                        {formData.adminFirstName && formData.adminLastName 
                          ? `${formData.adminFirstName} ${formData.adminLastName}`
                          : 'Not specified'
                        }
                      </p>
                      <p className="text-sm text-gray-600">{formData.adminEmail || 'Not specified'}</p>
                    </div>
                  )}
                  
                  {step >= 3 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Plan</h4>
                      <p className="text-sm text-gray-600 capitalize">
                        {plans.find(p => p.id === formData.selectedPlan)?.name || 'Not selected'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Benefits Card */}
              <Card>
                <CardHeader>
                  <CardTitle>What's Included</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    30-day free trial
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    No setup fees
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    Cancel anytime
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    Full feature access
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    Email support
                  </div>
                </CardContent>
              </Card>

              {/* Contact Support */}
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 mb-3">
                    Need help? Our team is here to assist you.
                  </p>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href="/contact">
                      Contact Support
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
