"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { AuthService, type AuthUser } from '@/lib/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isImpersonating: boolean
  /** Re-fetch the session from the server. */
  refresh: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Single source of truth for the current user on the client. Reads the server
 * session via /api/auth/me (the httpOnly cookie is authoritative) and seeds
 * immediately from the cached localStorage user to avoid a flash. Replaces the
 * scattered `AuthService.getCurrentUser()` reads across the app.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const json = await res.json()
        const me = json?.data as Partial<AuthUser> | undefined
        if (me) {
          // Preserve client-only impersonation display state if present.
          const local = AuthService.getCurrentUser()
          setUser({ ...(local ?? {}), ...me } as AuthUser)
        } else {
          setUser(null)
        }
      } else if (res.status === 401) {
        setUser(null)
      } else {
        setUser(AuthService.getCurrentUser())
      }
    } catch {
      setUser(AuthService.getCurrentUser())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Seed from cache for an instant first paint, then verify with the server.
    setUser(AuthService.getCurrentUser())
    void refresh()
  }, [refresh])

  const logout = useCallback(() => {
    AuthService.logout()
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, loading, isImpersonating: !!user?.isImpersonating, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>')
  return ctx
}
