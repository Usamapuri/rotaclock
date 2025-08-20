"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { AuthService } from "@/lib/auth"

type Project = { id: string; name: string; description?: string }

export default function PMProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  useEffect(() => {
    async function load() {
      const user = AuthService.getCurrentUser()
      const res = await fetch('/api/project-manager/projects', {
        headers: { 'authorization': `Bearer ${user?.id || ''}` }
      })
      const data = await res.json()
      setProjects(data?.data || [])
    }
    load()
  }, [])

  async function createProject() {
    try {
      const user = AuthService.getCurrentUser()
      const res = await fetch('/api/project-manager/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${user?.id || ''}` },
        body: JSON.stringify(form)
      })
      if (!res.ok) {
        const e = await res.json()
        toast.error(e.error || 'Failed to create project')
        return
      }
      toast.success('Project created')
      setOpen(false)
      setForm({ name: '', description: '' })
      const refresh = await fetch('/api/project-manager/projects', { headers: { 'authorization': `Bearer ${user?.id || ''}` } })
      const data = await refresh.json()
      setProjects(data?.data || [])
    } catch (err) {
      toast.error('Failed to create project')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name" value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} />
              <Button onClick={createProject}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {projects.map(p => (
          <Card key={p.id}>
            <CardHeader><CardTitle>{p.name}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">{p.description || ''}</div>
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && <div className="text-sm text-muted-foreground">No projects assigned.</div>}
      </div>
    </div>
  )
}


