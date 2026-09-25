'use client'

import { Toaster } from 'react-hot-toast'
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { UserRole } from '@/types'

interface AppUser {
  id: string
  email: string
  role: UserRole
  isActive: boolean
}

interface AuthContextValue {
  user: AppUser | null
  session: any | null
  loading: boolean
  login: (email: string, password: string) => Promise<AppUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { method: 'GET' })
      if (res.ok) {
        const json = await res.json()
        if (json.user) {
          setUser(json.user)
          return
        }
      }
      setUser(null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email: string, password: string): Promise<AppUser> => {
    const cleanEmail = email.trim().toLowerCase()
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    })
    const json = await res.json()
    if (!res.ok || json.error) {
      throw new Error(json.error || 'Invalid email or password')
    }
    const appUser: AppUser = json.user
    setUser(appUser)
    return appUser
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user ? { user } : null,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      <Toaster position="top-right" />
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const Providers = AuthProvider
