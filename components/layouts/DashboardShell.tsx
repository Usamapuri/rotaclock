"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import React, { ReactNode, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { AuthService } from "@/lib/auth"
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export type DashboardLink = {
  href: string
  label: string
  icon?: ReactNode
}

interface DashboardShellProps {
  headerLabel: string
  links: DashboardLink[]
  children: ReactNode
}

export function DashboardShell({ headerLabel, links, children }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    AuthService.logout()
    router.push('/login')
  }

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

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="offcanvas">
        <SidebarHeader>
          <div className="px-2 py-1 text-sm font-semibold">{headerLabel}</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {links.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton asChild isActive={isActive(link.href)}>
                  <Link href={link.href}>
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <SidebarSeparator />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <div className="text-sm text-muted-foreground">{headerLabel} Panel</div>
          </div>
          <div className="flex items-center gap-2">
            <Breadcrumb>
              <BreadcrumbList>
                {crumbs.map((c, idx) => (
                  <React.Fragment key={idx}>
                    <BreadcrumbItem>
                      {c.href ? (
                        <BreadcrumbLink href={c.href}>{c.name}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{c.name}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {idx < crumbs.length - 1 && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
        <div className="p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}


