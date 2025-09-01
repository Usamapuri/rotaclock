'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Star, Zap, Users, Calendar, Shield, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const pricingPlans = [
  {
    name: 'Starter',
    price: '$2',
    period: '/month',
    description: 'Perfect for small teams getting started',
    features: [
      'Up to 10 employees',
      'Basic shift scheduling',
      'Time tracking',
      'Payroll calculation',
      'Email support',
      'Mobile app access',
      '30-day free trial',
      'No setup fees'
    ],
    popular: false,
    icon: Users,
    color: 'bg-blue-500',
    buttonText: 'Start Free Trial',
    buttonVariant: 'outline' as const
  },
  {
    name: 'Professional',
    price: '$5',
    period: '/month',
    description: 'Ideal for growing businesses',
    features: [
      'Up to 50 employees',
      'Advanced scheduling',
      'Real-time tracking',
      'Automated payroll',
      'Performance analytics',
      'Team management',
      'Priority support',
      'Custom reports',
      'API access',
      'Advanced integrations'
    ],
    popular: true,
    icon: TrendingUp,
    color: 'bg-purple-500',
    buttonText: 'Start Free Trial',
    buttonVariant: 'default' as const
  },
  {
    name: 'Enterprise',
    price: '$10',
    period: '/month',
    description: 'For large organizations with complex needs',
    features: [
      'Unlimited employees',
      'Multi-location support',
      'Advanced analytics',
      'Custom workflows',
      'White-label options',
      'Dedicated support',
      'SLA guarantees',
      'Custom integrations',
      'Advanced security',
      'Compliance features'
    ],
    popular: false,
    icon: Shield,
    color: 'bg-green-500',
    buttonText: 'Contact Sales',
    buttonVariant: 'outline' as const
  }
]

const features = [
  {
    title: 'Smart Scheduling',
    description: 'AI-powered shift scheduling that optimizes for productivity and employee preferences',
    icon: Calendar
  },
  {
    title: 'Real-time Tracking',
    description: 'Monitor attendance, breaks, and productivity in real-time with GPS verification',
    icon: Clock
  },
  {
    title: 'Automated Payroll',
    description: 'Calculate wages, overtime, bonuses, and deductions automatically',
    icon: Zap
  },
  {
    title: 'Performance Analytics',
    description: 'Track KPIs, productivity metrics, and generate detailed reports',
    icon: TrendingUp
  }
]

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF8] to-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-blue-50 text-blue-700 border-blue-200">
            <Star className="w-4 h-4 mr-2" />
            Most Popular Choice
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan for your organization. All plans include a 30-day free trial.
            No credit card required to start.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">
                Save 20%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-20">
          {pricingPlans.map((plan, index) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? 'border-2 border-purple-500 shadow-xl scale-105'
                  : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-500 text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <div className={`w-12 h-12 rounded-lg ${plan.color} flex items-center justify-center mx-auto mb-4`}>
                  <plan.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {billingCycle === 'yearly' 
                      ? `$${Math.round(parseInt(plan.price.replace('$', '')) * 0.8)}`
                      : plan.price
                    }
                  </span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-6">
                <Button
                  variant={plan.buttonVariant}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-purple-500 hover:bg-purple-600 text-white'
                      : ''
                  }`}
                  asChild
                >
                  <Link href={plan.name === 'Enterprise' ? '/contact' : '/signup'}>
                    {plan.buttonText}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Features Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything you need to manage your workforce
          </h2>
          <p className="text-gray-600 mb-12">
            Powerful features designed to streamline your operations and boost productivity
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens after the free trial?
              </h3>
              <p className="text-gray-600">
                After 30 days, your account will automatically convert to the paid plan. You can cancel anytime.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a setup fee?
              </h3>
              <p className="text-gray-600">
                No setup fees! All plans include free onboarding and support to get you started quickly.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer custom pricing for large organizations?
              </h3>
              <p className="text-gray-600">
                Yes! Contact our sales team for custom enterprise solutions with dedicated support and features.
              </p>
            </div>
          </div>
        </div>

                 {/* CTA Section */}
         <div className="text-center mt-20">
           <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-white">
             <h2 className="text-3xl font-bold mb-4">
               Ready to get started?
             </h2>
             <p className="text-xl mb-8 opacity-90">
               Join thousands of organizations using RotaClock to manage their workforce
             </p>
             <div className="space-x-4">
               <Button size="lg" variant="secondary" asChild>
                 <Link href="/signup">
                   Start Free Trial
                 </Link>
               </Button>
               <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-blue-600" asChild>
                 <Link href="/contact">
                   Contact Sales
                 </Link>
               </Button>
             </div>
           </div>
         </div>
      </div>
    </div>
  )
}
