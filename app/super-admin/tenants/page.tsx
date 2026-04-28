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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type TenantEmployee = {
  id: string
  email: string
  employee_code: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
}

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
  const [userDialogTenant, setUserDialogTenant] = useState<Tenant | null>(null)
  const [tenantEmployees, setTenantEmployees] = useState<TenantEmployee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({})
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

  const openUserDialog = async (tenant: Tenant) => {
    setUserDialogTenant(tenant)
    setTenantEmployees([])
    setResetPasswords({})
    setLoadingEmployees(true)
    try {
      const enc = encodeURIComponent(tenant.tenant_id)
      const res = await fetch(`/api/super-admin/tenants/${enc}/employees`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load users')
      setTenantEmployees(data.data || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoadingEmployees(false)
    }
  }

  const submitResetPassword = async (employeeId: string) => {
    const newPassword = resetPasswords[employeeId]?.trim() || ''
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    try {
      const res = await fetch('/api/super-admin/users/reset-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ employeeId, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed')
      toast.success(data.message || 'Password reset')
      setResetPasswords((prev) => ({ ...prev, [employeeId]: '' }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reset failed')
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
                  <TableHead>Users</TableHead>
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
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openUserDialog(t)}>
                        Users / reset password
                      </Button>
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

      <Dialog open={!!userDialogTenant} onOpenChange={(o) => !o && setUserDialogTenant(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tenant users</DialogTitle>
            <DialogDescription>
              {userDialogTenant ? `${userDialogTenant.name} (${userDialogTenant.tenant_id})` : ''} — set a new
              password for any user. They sign in with <strong>email</strong> on the main login page (not organization
              email unless it is the same).
            </DialogDescription>
          </DialogHeader>
          {loadingEmployees ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="min-w-[200px]">New password</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantEmployees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        {e.first_name} {e.last_name}
                        <div className="text-xs text-slate-500">{e.employee_code}</div>
                      </TableCell>
                      <TableCell className="text-sm">{e.email}</TableCell>
                      <TableCell className="capitalize">{e.role}</TableCell>
                      <TableCell>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Min 8 characters"
                          value={resetPasswords[e.id] ?? ''}
                          onChange={(ev) =>
                            setResetPasswords((prev) => ({ ...prev, [e.id]: ev.target.value }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => submitResetPassword(e.id)}>
                          Set password
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {tenantEmployees.length === 0 && !loadingEmployees ? (
                <p className="text-sm text-slate-500">No employees found.</p>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
