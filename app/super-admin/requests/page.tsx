'use client'

import { useCallback, useEffect, useState } from 'react'
import { AuthService } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Row = {
  id: string
  status: string
  payload: Record<string, string>
  created_at: string
  rejection_reason?: string | null
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const u = AuthService.getCurrentUser()
  if (u?.id) headers['authorization'] = `Bearer ${u.id}`
  return headers
}

export default function SuperAdminRequestsPage() {
  const [status, setStatus] = useState<string>('pending')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = status === 'all' ? '' : `?status=${encodeURIComponent(status)}`
      const res = await fetch(`/api/super-admin/requests${q}`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setRows(data.data || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load requests')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const approve = async (id: string) => {
    try {
      const res = await fetch(`/api/super-admin/requests/${id}/approve`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Approve failed')
      toast.success('Organization provisioned')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approve failed')
    }
  }

  const reject = async () => {
    if (!rejectId) return
    try {
      const res = await fetch(`/api/super-admin/requests/${rejectId}/reject`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reason: rejectReason || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reject failed')
      toast.success('Request rejected')
      setRejectId(null)
      setRejectReason('')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reject failed')
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Signup requests</h1>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-slate-600">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Admin email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const p = r.payload || {}
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{p.organizationName || '—'}</div>
                      <div className="text-xs text-slate-500">{p.organizationEmail || ''}</div>
                    </TableCell>
                    <TableCell>{p.adminEmail || '—'}</TableCell>
                    <TableCell>{p.selectedPlan || '—'}</TableCell>
                    <TableCell>
                      <span className="capitalize">{r.status}</span>
                      {r.rejection_reason ? (
                        <div className="text-xs text-red-600 mt-1 max-w-[200px]">{r.rejection_reason}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {r.status === 'pending' ? (
                        <>
                          <Button size="sm" onClick={() => approve(r.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setRejectId(r.id)}>
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {!loading && rows.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No requests</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>Optional note stored with the rejection.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
