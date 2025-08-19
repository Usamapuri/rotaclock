"use client"

import { useState, useEffect } from 'react'
import { AuthService } from '@/lib/auth'

export default function TestAuth() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [testResult, setTestResult] = useState<string>('')

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setCurrentUser(user)
  }, [])

  const testAdminLogin = async () => {
    const result = await AuthService.adminLogin('admin', 'admin123')
    setTestResult(`Admin login test: ${result ? 'SUCCESS' : 'FAILED'}`)
    if (result) {
      setCurrentUser(result)
    }
  }

  const testWrongCredentials = async () => {
    const result = await AuthService.adminLogin('wrong', 'wrong')
    setTestResult(`Wrong credentials test: ${result ? 'FAILED (should be null)' : 'SUCCESS (correctly rejected)'}`)
  }

  const logout = () => {
    AuthService.logout()
    setCurrentUser(null)
    setTestResult('Logged out')
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Test Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Current User:</h2>
          <pre className="bg-gray-100 p-2 rounded mt-2">
            {currentUser ? JSON.stringify(currentUser, null, 2) : 'Not logged in'}
          </pre>
        </div>

        <div className="space-y-2">
          <button 
            onClick={testAdminLogin}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Admin Login (admin/admin123)
          </button>
          
          <button 
            onClick={testWrongCredentials}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ml-2"
          >
            Test Wrong Credentials
          </button>
          
          <button 
            onClick={logout}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 ml-2"
          >
            Logout
          </button>
        </div>

        {testResult && (
          <div className="p-4 border rounded bg-yellow-50">
            <strong>Test Result:</strong> {testResult}
          </div>
        )}

        <div className="p-4 border rounded bg-blue-50">
          <h3 className="font-semibold">Expected Behavior:</h3>
          <ul className="list-disc list-inside mt-2">
            <li>Admin login with "admin/admin123" should succeed</li>
            <li>Wrong credentials should be rejected</li>
            <li>Logout should clear the session</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 