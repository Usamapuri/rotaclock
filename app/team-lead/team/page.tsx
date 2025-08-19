"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  status?: string
}

export default function TeamLeadTeamOverviewPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== "team_lead") {
      router.replace("/team-lead/login")
      return
    }
    ;(async () => {
      try {
        setError(null)
        const byLead = await fetch(`/api/teams/by-lead?leadId=${user.id}`)
        if (!byLead.ok) throw new Error("Failed to resolve team")
        const byLeadJson = await byLead.json()
        const team = (byLeadJson.data || [])[0]
        if (!team) {
          setTeamId(null)
          setMembers([])
          setLoading(false)
          return
        }
        setTeamId(team.id)
        const resp = await fetch(`/api/teams/${team.id}/members`)
        if (!resp.ok) throw new Error("Failed to load members")
        const json = await resp.json()
        setMembers(json.data || [])
      } catch (e: any) {
        setError(e.message || "Error")
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q)
    )
  }, [members, query])

  function exportCsv() {
    const header = ["First Name", "Last Name", "Email"]
    const rows = filtered.map((m) => [m.first_name, m.last_name, m.email])
    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((field) => {
            const v = String(field ?? "")
            return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
          })
          .join(",")
      )
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "team_members.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Team Members</CardTitle>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Search name or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-56"
              />
              <Button variant="outline" onClick={exportCsv}>
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : teamId === null ? (
            <div className="text-gray-500">No team assigned.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8">
                      No members
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {m.first_name} {m.last_name}
                      </TableCell>
                      <TableCell>{m.email}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
