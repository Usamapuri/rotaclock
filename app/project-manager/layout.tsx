"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ReactNode } from "react"
import { AuthService } from "@/lib/auth"
import { DashboardShell } from "@/components/layouts/DashboardShell"
import { LayoutDashboard, Users, Activity, BarChart3 } from "lucide-react"

export default function ProjectManagerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPM, setIsPM] = useState(false)
  const isLogin = pathname === '/project-manager/login'

  useEffect(() => {
    if (isLogin) return
    const user = AuthService.getCurrentUser()
    if (!user || user.role !== 'project_manager') {
      router.replace('/project-manager/login')
    } else {
      setIsPM(true)
    }
  }, [router, isLogin])

  const links = useMemo(() => [
    { href: '/project-manager/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
    { href: '/project-manager/projects', label: 'Projects', icon: <Users /> },
    { href: '/project-manager/teams', label: 'Teams', icon: <Users /> },
    { href: '/project-manager/live', label: 'Live Status', icon: <Activity /> },
    { href: '/project-manager/performance', label: 'Performance', icon: <BarChart3 /> },
  ], [])

  if (isLogin) return <>{children}</>
  if (!isPM) return null

  return (
    <DashboardShell headerLabel="Project Manager" links={links}>
      {children}
    </DashboardShell>
  )
}


