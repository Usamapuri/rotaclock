'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/lib/auth'
import { DashboardShell } from '@/components/layouts/DashboardShell'
import { Building2, ClipboardList, KeyRound, Shield, UserCog } from 'lucide-react'

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const u = AuthService.getCurrentUser()
    if (!u || u.role !== 'super_admin') {
      router.replace('/login')
      return
    }
    setAllowed(true)
  }, [router])

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Checking access…
      </div>
    )
  }

  return (
    <DashboardShell
      headerLabel="Super admin"
      links={[
        { href: '/super-admin', label: 'Overview', icon: <Shield className="h-4 w-4" /> },
        { href: '/super-admin/requests', label: 'Signup requests', icon: <ClipboardList className="h-4 w-4" /> },
        { href: '/super-admin/tenants', label: 'Tenants', icon: <Building2 className="h-4 w-4" /> },
        { href: '/super-admin/support', label: 'Support (impersonate)', icon: <UserCog className="h-4 w-4" /> },
        { href: '/super-admin/settings', label: 'Settings', icon: <KeyRound className="h-4 w-4" /> },
      ]}
    >
      {children}
    </DashboardShell>
  )
}
