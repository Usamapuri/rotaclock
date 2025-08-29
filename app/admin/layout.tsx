"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { AuthService } from "@/lib/auth"
import { DashboardShell } from "@/components/layouts/DashboardShell"
import { ReactNode } from "react"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Calendar,
  BarChart3,
  Clock,
  FolderKanban,
  DollarSign,
  Briefcase,
  CheckCircle,
} from "lucide-react"

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [role, setRole] = useState<'admin' | 'team_lead' | 'employee' | 'project_manager' | null>(null)
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setRole(user?.role ?? null)
    setIsImpersonating(AuthService.isImpersonating())
  }, [])

  const links = useMemo(() => {
    const base = [
      { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
      { href: "/admin/employees", label: "Agents", icon: <Users /> },
      { href: "/admin/teams", label: "Teams", icon: <FolderKanban /> },
      { href: "/admin/team-leads", label: "Team Leads", icon: <UserPlus /> },
      { href: "/admin/projects", label: "Projects", icon: <Briefcase /> },
      { href: "/admin/scheduling", label: "Scheduling", icon: <Calendar /> },
      { href: "/admin/shift-approvals", label: "Shift Approvals", icon: <CheckCircle /> },
      { href: "/admin/reports", label: "Reports", icon: <BarChart3 /> },
      { href: "/admin/timesheet", label: "Timesheet", icon: <Clock /> },
      { href: "/admin/onboarding", label: "Onboarding", icon: <Users /> },
      { href: "/admin/payroll", label: "Payroll", icon: <DollarSign /> },
    ]
    if (role === 'team_lead') {
      // Hide admin-only sections for team leads
      return base.filter(l => !["Employees", "Reports", "Onboarding"].includes(l.label))
    }
    return base
  }, [role])

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

  // Hide chrome (sidebar/breadcrumb) on auth page
  const isAuthPage = pathname === '/login'
  if (isAuthPage) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <DashboardShell headerLabel="Admin" links={links.map(l => ({ href: l.href, label: l.label, icon: l.icon }))}>
      {children}
    </DashboardShell>
  )
}
