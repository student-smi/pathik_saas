'use client'

import React, { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import toast from 'react-hot-toast'
import { Droplets, Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPwd, setShowPwd] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/resident')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      const userData = await login(email.trim(), password)
      toast.success(`Welcome back, ${userData.email}!`)
      const next = searchParams.get('next')
      if (next) {
        router.replace(next)
      } else {
        router.replace(userData.role === 'ADMIN' ? '/admin' : '/resident')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email address</label>
          <input
            type="email"
            className="input"
            placeholder="admin@pathiksco.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              className="input pr-10"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center py-2.5 mt-2"
        >
          {loading ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-1">
        <p className="font-semibold">Demo Credentials</p>
        <p>Admin: admin@pathiksco.com / Admin@123</p>
        <p>Resident: resident10@pathiksco.com / Resident@123</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Water Bill Management</h1>
          <p className="text-primary-200 mt-1 text-sm">Society Water Bill System</p>
        </div>

        <Suspense fallback={<div className="bg-white rounded-2xl p-8 text-center text-gray-500">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
