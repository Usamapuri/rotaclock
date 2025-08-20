"use client"

import { useEffect, useState } from "react"

export default function TestTeamLeadPage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testAPIs = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Test with David Wilson's ID
        const userId = "555e2e86-36c9-4a86-a11d-83bc2af20b04"
        
        console.log('🧪 Testing Team Lead APIs with user ID:', userId)
        
        const [membersRes, swapRes, leaveRes] = await Promise.all([
          fetch(`/api/team-lead/team/members`, {
            headers: {
              'Authorization': `Bearer ${userId}`
            }
          }),
          fetch(`/api/team-lead/shifts/swap-requests`, {
            headers: {
              'Authorization': `Bearer ${userId}`
            }
          }),
          fetch(`/api/team-lead/leave-requests`, {
            headers: {
              'Authorization': `Bearer ${userId}`
            }
          })
        ])
        
        const results = {
          members: {
            status: membersRes.status,
            ok: membersRes.ok,
            data: membersRes.ok ? await membersRes.json() : await membersRes.text()
          },
          swapRequests: {
            status: swapRes.status,
            ok: swapRes.ok,
            data: swapRes.ok ? await swapRes.json() : await swapRes.text()
          },
          leaveRequests: {
            status: leaveRes.status,
            ok: leaveRes.ok,
            data: leaveRes.ok ? await leaveRes.json() : await leaveRes.text()
          }
        }
        
        console.log('📊 API Test Results:', results)
        setResults(results)
        
      } catch (e: any) {
        console.error('❌ Error testing APIs:', e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    
    testAPIs()
  }, [])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Team Lead API Test Results</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Team Members</h2>
          <div className={`text-sm ${results.members?.ok ? 'text-green-600' : 'text-red-600'}`}>
            Status: {results.members?.status}
          </div>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(results.members?.data, null, 2)}
          </pre>
        </div>
        
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Swap Requests</h2>
          <div className={`text-sm ${results.swapRequests?.ok ? 'text-green-600' : 'text-red-600'}`}>
            Status: {results.swapRequests?.status}
          </div>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(results.swapRequests?.data, null, 2)}
          </pre>
        </div>
        
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Leave Requests</h2>
          <div className={`text-sm ${results.leaveRequests?.ok ? 'text-green-600' : 'text-red-600'}`}>
            Status: {results.leaveRequests?.status}
          </div>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(results.leaveRequests?.data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
