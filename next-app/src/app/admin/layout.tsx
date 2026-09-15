'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import toast from 'react-hot-toast'
import {
  Droplets, LayoutDashboard, Building2, Home, Users,
  FileText, History, Settings, LogOut, Menu, X
} from 'lucide-react'

const navItems = [
  { to: '/admin',           label: 'Dashboard',      icon: LayoutDashboard, end: true },
  { to: '/admin/societies', label: 'Societies',      icon: Building2 },
  { to: '/admin/houses',    label: 'Houses',         icon: Home },
  { to: '/admin/residents', label: 'Residents',      icon: Users },
  { to: '/admin/bills',     label: 'Monthly Bills',  icon: FileText },
  { to: '/admin/history',   label: 'History',        icon: History },
  { to: '/admin/config',    label: 'Calc Config',    icon: Settings },
]

const mobileNavItems = navItems.slice(0, 5)

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, loading } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (to: string, end?: boolean) => {
    if (end) return pathname === to
    return pathname?.startsWith(to) || false
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out')
      router.replace('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  const displayEmail = user?.email || 'admin@pathiksco.com'

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      <aside className="hidden md:flex w-56 bg-primary-900 text-white flex-col flex-shrink-0 shadow-xl">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-primary-700">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Water Bill</p>
            <p className="text-primary-300 text-xs">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => {
            const active = isActive(to, end)
            return (
              <Link
                key={to} href={to}
                className={
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                   ${active ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800 hover:text-white'}`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-primary-700 p-3">
          <div className="mb-2 px-2">
            <p className="text-xs text-primary-300">Signed in as</p>
            <p className="text-xs font-medium text-white truncate">{displayEmail}</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-primary-300 hover:text-white hover:bg-primary-800 text-sm transition-colors">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-primary-900 text-white flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-5 border-b border-primary-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Water Bill</p>
                  <p className="text-primary-300 text-xs">Admin Panel</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-primary-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
              {navItems.map(({ to, label, icon: Icon, end }) => {
                const active = isActive(to, end)
                return (
                  <Link
                    key={to} href={to}
                    onClick={() => setDrawerOpen(false)}
                    className={
                      `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                       ${active ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800 hover:text-white'}`
                    }
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-primary-700 p-3">
              <div className="mb-2 px-2">
                <p className="text-xs text-primary-300">Signed in as</p>
                <p className="text-xs font-medium text-white truncate">{displayEmail}</p>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-primary-300 hover:text-white hover:bg-primary-800 text-sm">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        <header className="bg-white border-b border-gray-200 h-14 flex items-center gap-3 px-4 shadow-sm flex-shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-700 rounded-md flex items-center justify-center md:hidden">
              <Droplets className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Water Bill Admin</span>
          </div>
          <div className="ml-auto text-xs text-gray-400 hidden sm:block truncate max-w-[200px]">{displayEmail}</div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30 shadow-lg">
          {mobileNavItems.map(({ to, label, icon: Icon, end }) => {
            const active = isActive(to, end)
            return (
              <Link
                key={to} href={to}
                className={
                  `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors
                   ${active ? 'text-primary-700' : 'text-gray-400'}`
                }
              >
                <div className={`p-1 rounded-lg ${active ? 'bg-primary-100' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span>{label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium text-gray-400"
          >
            <div className="p-1 rounded-lg">
              <Menu className="w-5 h-5" />
            </div>
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
