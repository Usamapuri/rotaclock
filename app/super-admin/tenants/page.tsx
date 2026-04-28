'use client'

import { useCallback, useEffect, useState } from 'react'
import { AuthService } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

type Tenant = {
  id: string
  tenant_id: string
  name: string
  email: string
  subscription_status: string
  trial_end_date: string | null
  max_employees: number
  is_active: boolean
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const u = AuthService.getCurrentUser()
  if (u?.id) headers['authorization'] = `Bearer ${u.id}`
  return headers
}

export default function SuperAdminTenantsPage() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [trialEdits, setTrialEdits] = useState<Record<string, string>>({})
  const [maxEdits, setMaxEdits] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      params.set('limit', '100')
      const res = await fetch(`/api/super-admin/tenants?${params}`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setRows(data.data || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const patchTenant = async (
    tenantId: string,
    body: Record<string, unknown>
  ) => {
    try {
      const enc = encodeURIComponent(tenantId)
      const res = await fetch(`/api/super-admin/tenants/${enc}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      toast.success('Tenant updated')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Tenants</h1>
      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <Label>Search</Label>
              <Input
                placeholder="Name, email, tenant id…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-64"
              />
            </div>
            <Button variant="outline" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Trial end</TableHead>
                  <TableHead>Max employees</TableHead>
                  <TableHead className="text-right">Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.tenant_id}</div>
                      <div className="text-xs text-slate-500">{t.email}</div>
                    </TableCell>
                    <TableCell className="capitalize">{t.subscription_status}</TableCell>
                    <TableCell>
                      <Switch
                        checked={t.is_active}
                        onCheckedChange={(v) => patchTenant(t.tenant_id, { is_active: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="datetime-local"
                        className="w-[200px]"
                        defaultValue={
                          t.trial_end_date
                            ? new Date(t.trial_end_date).toISOString().slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          setTrialEdits((prev) => ({ ...prev, [t.tenant_id]: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-24"
                        defaultValue={t.max_employees}
                        onChange={(e) =>
                          setMaxEdits((prev) => ({ ...prev, [t.tenant_id]: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const trial = trialEdits[t.tenant_id]
                          const maxRaw = maxEdits[t.tenant_id]
                          const patch: Record<string, unknown> = {}
                          if (trial) patch.trial_end_date = new Date(trial).toISOString()
                          if (maxRaw !== undefined && maxRaw !== '') {
                            const n = parseInt(maxRaw, 10)
                            if (!Number.isNaN(n)) patch.max_employees = n
                          }
                          if (Object.keys(patch).length === 0) {
                            toast.message('No trial or max employees changes to save')
                            return
                          }
                          patchTenant(t.tenant_id, patch)
                        }}
                      >
                        Apply fields
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
