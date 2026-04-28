'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const u = AuthService.getCurrentUser()
  if (u?.id) headers['authorization'] = `Bearer ${u.id}`
  return headers
}

export default function SuperAdminSupportPage() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')

  const start = async () => {
    const id = employeeId.trim()
    if (!id) {
      toast.error('Enter employee UUID')
      return
    }
    try {
      const res = await fetch('/api/super-admin/impersonate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ targetUserId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      await AuthService.startImpersonation(id, data.targetUser)
      toast.success(`Impersonating ${data.targetUser.email}`)

      const role = String(data.targetUser.role || '').toLowerCase()
      if (role === 'employee' || role === 'agent') {
        router.push('/employee/dashboard')
      } else if (role === 'manager') {
        router.push('/manager/dashboard')
      } else {
        router.push('/admin/dashboard')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-lg">
      <h1 className="text-2xl font-semibold text-slate-900">Support impersonation</h1>
      <Card>
        <CardHeader>
          <CardTitle>Act as employee</CardTitle>
          <CardDescription>
            Enter the target user&apos;s UUID (from the employees table). Use &quot;Stop impersonation&quot; in the app
            banner to return here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empId">Employee ID (UUID)</Label>
            <Input
              id="empId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
          <Button onClick={start}>Start</Button>
        </CardContent>
      </Card>
    </div>
  )
}
