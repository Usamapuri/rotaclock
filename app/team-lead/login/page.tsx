"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"

export default function TeamLeadLoginPage() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !password) {
      toast.error('Please enter your Employee ID and password')
      return
    }
    try {
      setLoading(true)
      const user = await AuthService.employeeLogin(employeeId, password)
      if (!user) {
        toast.error('Login failed')
        return
      }
      if (user.role !== 'team_lead') {
        AuthService.logout()
        toast.error('No team lead privileges for this account')
        return
      }
      router.push('/team-lead/dashboard')
    } catch (e) {
      console.error(e)
      toast.error('Login error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Team Lead Login</CardTitle>
          <CardDescription>Sign in with your Employee ID</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input id="employeeId" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="e.g. EMP001" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
