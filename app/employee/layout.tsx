"use client"

import { ReactNode, useMemo } from "react"
import { DashboardShell } from "@/components/layouts/DashboardShell"
import { LayoutDashboard, Calendar, BarChart3, User } from "lucide-react"

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  const links = useMemo(() => [
    { href: '/employee/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
    { href: '/employee/scheduling', label: 'Scheduling', icon: <Calendar /> },
    { href: '/employee/time-history', label: 'Time History', icon: <BarChart3 /> },
    { href: '/employee/profile', label: 'Profile', icon: <User /> },
  ], [])

  return (
    <DashboardShell headerLabel="Employee" links={links}>
      {children}
    </DashboardShell>
  )
}


