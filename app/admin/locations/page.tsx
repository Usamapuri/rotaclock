"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AuthService } from "@/lib/auth"
import { toast } from "sonner"

interface Location { id: string; name: string; description?: string; is_active: boolean }

export default function LocationsAdmin() {
  const [locations, setLocations] = useState<Location[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const headers = () => {
    const user = AuthService.getCurrentUser()
    const h: Record<string,string> = { 'Content-Type': 'application/json' }
    if (user?.id) h['authorization'] = `Bearer ${user.id}`
    if (user?.tenant_id) h['x-tenant-id'] = user.tenant_id
    return h
  }

  const load = async () => {
    const res = await fetch('/api/locations', { headers: headers() })
    if (res.ok) {
      const data = await res.json()
      setLocations(data.data || [])
    }
  }

  const create = async () => {
    if (!name.trim()) return
    const res = await fetch('/api/locations', { method: 'POST', headers: headers(), body: JSON.stringify({ name, description }) })
    if (res.ok) {
      toast.success('Location created')
      setName("")
      setDescription("")
      load()
    } else {
      toast.error('Failed to create location')
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Lahore Office" />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <Button onClick={create}>Add Location</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map(loc => (
                <TableRow key={loc.id}>
                  <TableCell>{loc.name}</TableCell>
                  <TableCell>{loc.description || '-'}</TableCell>
                  <TableCell>{loc.is_active ? 'Active' : 'Inactive'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}


