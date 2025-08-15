"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthService } from "@/lib/auth"

type Project = { id: string; name: string; description?: string }

export default function PMProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])

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

  return (
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
  )
}


