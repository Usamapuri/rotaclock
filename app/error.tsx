'use client'

// Force dynamic rendering to prevent build issues
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const preferredRegion = 'auto'
export const runtime = 'nodejs'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 bg-red-100 p-3 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl">Something went wrong!</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Error: {error.message || 'Unknown error'}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={reset}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={() => router.push('/')}
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 