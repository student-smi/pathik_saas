'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import toast from 'react-hot-toast'
import { Droplets, LogOut } from 'lucide-react'

export default function ResidentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [houseNo, setHouseNo] = useState<string>('—')
  const [societyName, setSocietyName] = useState<string>('—')

  const displayEmail = user?.email || 'resident@pathiksco.com'
  const displayName = user?.email?.split('@')[0] || 'Resident'

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/portal/bills')
        if (!res.ok || !active) return
        const data = await res.json()
        if (active) {
          setHouseNo(data.houseNo || '—')
          setSocietyName(data.societyName || '—')
        }
      } catch {}
    })()
    return () => { active = false }
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out')
      router.replace('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  const isDashboardActive = pathname === '/resident'

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-800 text-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Water Bill</p>
              <p className="text-primary-300 text-xs">
                House {houseNo} — {societyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/resident"
              className={`text-sm px-3 py-1.5 rounded-lg ${isDashboardActive ? 'bg-primary-700' : 'hover:bg-primary-700'}`}
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-primary-300 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
