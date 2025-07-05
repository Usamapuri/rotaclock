// Force dynamic rendering to prevent build issues
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const preferredRegion = 'auto'
export const runtime = 'nodejs'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 bg-blue-100 p-3 rounded-full w-fit">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <CardTitle className="text-xl">Loading...</CardTitle>
          <CardDescription>
            Please wait while we load your content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              This should only take a moment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 