import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Droplets, LayoutDashboard, History, LogOut } from 'lucide-react'

export default function ResidentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-primary-800 text-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Water Bill</p>
              <p className="text-primary-300 text-xs">
                {user?.resident ? `House ${user.resident.houseNo} — ${user.resident.society}` : 'Resident Portal'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NavLink to="/resident" end className={({ isActive }) => `text-sm px-3 py-1.5 rounded-lg ${isActive ? 'bg-primary-700' : 'hover:bg-primary-700'}`}>Dashboard</NavLink>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-primary-300 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
