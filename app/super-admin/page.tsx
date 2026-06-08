'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SuperAdminOverviewPage() {
  const [pending, setPending] = useState<number | null>(null)
  const [tenants, setTenants] = useState<number | null>(null)

  useEffect(() => {
    // Auth travels via the httpOnly session cookie (same-origin); no header needed.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    ;(async () => {
      try {
        const [r, t] = await Promise.all([
          fetch('/api/super-admin/requests?status=pending', { headers }),
          fetch('/api/super-admin/tenants?limit=500', { headers }),
        ])
        if (r.ok) {
          const jr = await r.json()
          setPending(Array.isArray(jr.data) ? jr.data.length : 0)
        }
        if (t.ok) {
          const jt = await t.json()
          setTenants(Array.isArray(jt.data) ? jt.data.length : 0)
        }
      } catch {
        setPending(null)
        setTenants(null)
      }
    })()
  }, [])

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Platform overview</h1>
        <p className="text-slate-600 mt-1">Review tenant signups, manage organizations, and support impersonation.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending signups</CardTitle>
            <CardDescription>Organizations waiting for approval</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-3xl font-bold text-amber-700">{pending ?? '—'}</p>
            <Button asChild variant="outline">
              <Link href="/super-admin/requests">Open queue</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tenants (loaded)</CardTitle>
            <CardDescription>Organizations returned in last directory fetch</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-800">{tenants ?? '—'}</p>
            <Button asChild variant="outline">
              <Link href="/super-admin/tenants">Manage tenants</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
