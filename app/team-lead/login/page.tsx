"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TeamLeadLoginRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/login")
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to unified login...</p>
      </div>
    </div>
  )
}
