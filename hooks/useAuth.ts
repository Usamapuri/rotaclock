import { useState, useEffect, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface Employee {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  position: string
  department: string
  hire_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const signUp = useCallback(async (email: string, password: string, employeeData: Partial<Employee>) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: employeeData.first_name,
            last_name: employeeData.last_name,
            phone: employeeData.phone,
            position: employeeData.position,
            department: employeeData.department
          }
        }
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // Create employee record
        const { error: employeeError } = await supabase
          .from('employees')
          .insert({
            user_id: data.user.id,
            first_name: employeeData.first_name!,
            last_name: employeeData.last_name!,
            email: email,
            phone: employeeData.phone,
            position: employeeData.position!,
            department: employeeData.department!,
            hire_date: new Date().toISOString(),
            is_active: true
          })

        if (employeeError) {
          console.error('Error creating employee record:', employeeError)
          // Don't throw here as the user was created successfully
        }
      }

      toast.success('Account created successfully! Please check your email to verify your account.')
      return { user: data.user, session: data.session }
    } catch (err) {
      const errorMessage = err instanceof AuthError ? err.message : 'Failed to create account'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw error
      }

      toast.success('Signed in successfully!')
      return { user: data.user, session: data.session }
    } catch (err) {
      const errorMessage = err instanceof AuthError ? err.message : 'Failed to sign in'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)

    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }

      setUser(null)
      setSession(null)
      setEmployee(null)
      toast.success('Signed out successfully!')
    } catch (err) {
      const errorMessage = err instanceof AuthError ? err.message : 'Failed to sign out'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        throw error
      }

      toast.success('Password reset email sent! Please check your inbox.')
    } catch (err) {
      const errorMessage = err instanceof AuthError ? err.message : 'Failed to send reset email'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password
      })

      if (error) {
        throw error
      }

      toast.success('Password updated successfully!')
    } catch (err) {
      const errorMessage = err instanceof AuthError ? err.message : 'Failed to update password'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (updates: Partial<Employee>) => {
    if (!user) {
      toast.error('You must be signed in to update your profile')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      setEmployee(data)
      toast.success('Profile updated successfully!')
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchEmployee = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching employee:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Error fetching employee:', err)
      return null
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const employeeData = await fetchEmployee(session.user.id)
        setEmployee(employeeData)
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const employeeData = await fetchEmployee(session.user.id)
          setEmployee(employeeData)
        } else {
          setEmployee(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchEmployee])

  return {
    user,
    session,
    employee,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: employee?.position?.toLowerCase().includes('admin') || false
  }
} 