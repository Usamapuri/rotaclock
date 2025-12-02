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
  Calendar,
  BarChart3,
  Clock,
  CheckCircle,
  MapPin,
  Settings as SettingsIcon,
  HelpCircle,
} from "lucide-react"

export default function ManagerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [role, setRole] = useState<'admin' | 'manager' | 'employee' | null>(null)
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setRole(user?.role ?? null)
    setIsImpersonating(AuthService.isImpersonating())
  }, [])

  const links = useMemo(() => {
    const base = [
      { href: "/manager/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
      { href: "/manager/scheduling", label: "Rota", icon: <Calendar /> },
      { href: "/manager/teams", label: "Teams", icon: <Users /> },
      { href: "/manager/employees", label: "Employees", icon: <Users /> },
      { href: "/manager/timesheets", label: "Timesheets", icon: <Clock /> },
      { href: "/manager/approvals", label: "Approvals", icon: <CheckCircle /> },
      { href: "/manager/reports", label: "Reports", icon: <BarChart3 /> },
      { href: "/manager/settings", label: "Settings", icon: <SettingsIcon /> },
      { href: "/manager/help", label: "Help", icon: <HelpCircle /> },
    ]
    return base
  }, [role])

  const crumbs = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    const breadcrumbs = []

    if (parts[0] === 'manager') {
      breadcrumbs.push({ label: 'Manager', href: '/manager/dashboard' })

      if (parts[1]) {
        const section = parts[1]
        const link = links.find(l => l.href.includes(section))
        if (link) {
          breadcrumbs.push({ label: link.label, href: link.href })
        }
      }
    }

    return breadcrumbs
  }, [pathname, links])

  return (
    <DashboardShell
      headerLabel="Manager Portal"
      links={links}
    >
      {children}
    </DashboardShell>
  )
}
