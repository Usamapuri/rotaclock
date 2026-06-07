"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
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

  const links = useMemo(() => {
    const base = [
      { href: "/manager/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
      { href: "/manager/scheduling", label: "Rota", icon: <Calendar /> },
      { href: "/manager/employees", label: "Team", icon: <Users /> },
      { href: "/manager/timesheets", label: "Timesheets", icon: <Clock /> },
      { href: "/manager/approvals", label: "Approvals", icon: <CheckCircle /> },
      { href: "/manager/reports", label: "Reports", icon: <BarChart3 /> },
      { href: "/manager/settings", label: "Settings", icon: <SettingsIcon /> },
      { href: "/manager/help", label: "Help", icon: <HelpCircle /> },
    ]
    return base
  }, [])

  // Hide chrome (sidebar/breadcrumb) on auth page
  const isAuthPage = pathname === '/login'
  if (isAuthPage) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <DashboardShell headerLabel="Manager Portal" links={links}>
      {children}
    </DashboardShell>
  )
}
