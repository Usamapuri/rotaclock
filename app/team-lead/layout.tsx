"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { AuthService } from "@/lib/auth"
import { DashboardShell } from "@/components/layouts/DashboardShell"
import { ReactNode } from "react"
import { LayoutDashboard, Users, Activity, BarChart3 } from "lucide-react"

export default function TeamLeadLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLead, setIsLead] = useState(false)
  const isLogin = pathname === '/login'

  useEffect(() => {
    if (isLogin) return
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'team_lead') {
      router.replace('/login')
    } else {
      setIsLead(true)
    }
  }, [router, isLogin])

  const links = useMemo(() => [
    { href: '/team-lead/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
    { href: '/team-lead/team', label: 'Team Overview', icon: <Users /> },
    { href: '/team-lead/live', label: 'Live Status', icon: <Activity /> },
    { href: '/team-lead/performance', label: 'Performance', icon: <BarChart3 /> },
  ], [])

  const crumbs = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    const items: { name: string; href?: string }[] = []
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      acc += '/' + parts[i]
      items.push({ name: decodeURIComponent(parts[i]), href: i < parts.length - 1 ? acc : undefined })
    }
    return items
  }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // Allow the login page to render without the protected layout and gating
  if (isLogin) return <>{children}</>
  if (!isLead) return null

  return (
    <DashboardShell
      headerLabel="Team Lead"
      links={links.map(l => ({ href: l.href, label: l.label, icon: l.icon }))}
    >
      {children}
    </DashboardShell>
  )
}
