"use client"

import { useState, useEffect } from 'react'
import { AlertTriangle, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [originalUser, setOriginalUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const checkImpersonationStatus = () => {
      const user = AuthService.getCurrentUser()
      const impersonating = AuthService.isImpersonating()
      const original = AuthService.getOriginalUser()
      
      setIsImpersonating(impersonating)
      setCurrentUser(user)
      setOriginalUser(original)
    }

    checkImpersonationStatus()
    
    // Listen for storage changes (when impersonation state changes)
    const handleStorageChange = () => {
      checkImpersonationStatus()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleStopImpersonation = async () => {
    try {
      const user = AuthService.getCurrentUser()
      const original = AuthService.getOriginalUser()
      const response = await fetch('/api/admin/impersonation', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Prefer the original admin identity for stopping impersonation
          ...((original?.id || user?.id) ? { authorization: `Bearer ${original?.id || user?.id}` } : {}),
        },
      })

      if (response.ok) {
        const restoredUser = await AuthService.stopImpersonation()
        setIsImpersonating(false)
        setCurrentUser(restoredUser)
        setOriginalUser(null)
        
        toast.success('Impersonation stopped')
        router.push('/admin/dashboard')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to stop impersonation')
      }
    } catch (error) {
      console.error('Error stopping impersonation:', error)
      toast.error('Failed to stop impersonation')
    }
  }

  if (!isImpersonating) {
    return null
  }

  return (
    <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-orange-800">
              You are impersonating:
            </span>
            <span className="text-sm text-orange-700 font-semibold">
              {currentUser?.first_name} {currentUser?.last_name} ({currentUser?.email})
            </span>
            <UserCheck className="h-4 w-4 text-orange-600" />
          </div>
          {originalUser && (
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-orange-300">
              <span className="text-sm text-orange-600">
                Original user:
              </span>
              <span className="text-sm text-orange-700">
                {originalUser.first_name} {originalUser.last_name} ({originalUser.email})
              </span>
            </div>
          )}
        </div>
        <Button
          onClick={handleStopImpersonation}
          variant="outline"
          size="sm"
          className="border-orange-300 text-orange-700 hover:bg-orange-100"
        >
          <UserX className="h-4 w-4 mr-2" />
          Stop Impersonation
        </Button>
      </div>
    </div>
  )
}
