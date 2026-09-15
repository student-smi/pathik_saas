'use client'

import { Toaster } from 'react-hot-toast'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'

interface AppUser {
  id: string
  email: string
  role: UserRole
  isActive: boolean
}

interface AuthContextValue {
  user: AppUser | null
  session: Session | null
  loading: boolean
  login: (email: string, password: string) => Promise<AppUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function deriveRoleFromMetadata(user: SupabaseUser | null): UserRole {
  if (!user) return 'RESIDENT'
  const raw = (user.app_metadata as any)?.role ?? (user.user_metadata as any)?.role
  if (raw === 'ADMIN' || user.email?.startsWith('admin')) return 'ADMIN'
  return 'RESIDENT'
}

async function fetchAppUser(userId: string, email: string, supabase: ReturnType<typeof createClient>): Promise<AppUser> {
  try {
    const { data } = await supabase
      .from('users')
      .select('id, email, role, isActive')
      .eq('id', userId)
      .maybeSingle()

    if (data && data.role) {
      return {
        id: data.id,
        email: data.email || email,
        role: (data.role === 'ADMIN' || email.startsWith('admin') ? 'ADMIN' : 'RESIDENT') as UserRole,
        isActive: data.isActive !== undefined ? !!data.isActive : true,
      }
    }
  } catch {
  }
  return {
    id: userId,
    email,
    role: email.startsWith('admin') ? 'ADMIN' : 'RESIDENT',
    isActive: true,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const refreshUser = async () => {
    if (!session?.user) return
    const appUser = await fetchAppUser(session.user.id, session.user.email || '', supabase)
    setUser(appUser)
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      if (s?.user) {
        fetchAppUser(s.user.id, s.user.email || '', supabase).then(appUser => {
          if (mounted) {
            setUser(appUser)
            setLoading(false)
          }
        })
      } else {
        if (mounted) setLoading(false)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return
      setSession(s)
      if (s?.user) {
        fetchAppUser(s.user.id, s.user.email || '', supabase).then(appUser => {
          if (mounted) {
            setUser(appUser)
            setLoading(false)
          }
        })
      } else {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<AppUser> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    if (!data.session?.user) throw new Error('No session returned')
    const appUser = await fetchAppUser(data.session.user.id, data.session.user.email || '', supabase)
    setSession(data.session)
    setUser(appUser)
    return appUser
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout, refreshUser }}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#16a34a',
              color: '#fff',
            },
          },
          error: {
            duration: 5000,
          },
        }}
      />
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
