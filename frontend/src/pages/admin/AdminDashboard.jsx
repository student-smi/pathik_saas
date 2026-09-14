import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { Building2, Home, Users, FileText, TrendingUp, AlertTriangle } from 'lucide-react'

export default function AdminDashboard() {
  const [societies, setSocieties] = useState([])
  const [stats, setStats] = useState({ houses: 0, residents: 0, bills: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/societies').then(res => {
      setSocieties(res.data)
      const houses = res.data.reduce((a, s) => a + (s._count?.houses || 0), 0)
      setStats(s => ({ ...s, houses }))
    }).finally(() => setLoading(false))
  }, [])

  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Society Water Bill Management — {monthName}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Societies', value: societies.length, icon: Building2, color: 'text-blue-600 bg-blue-50', to: '/admin/societies' },
          { label: 'Houses', value: stats.houses, icon: Home, color: 'text-emerald-600 bg-emerald-50', to: '/admin/houses' },
          { label: 'Bills This Month', value: '—', icon: FileText, color: 'text-violet-600 bg-violet-50', to: '/admin/bills' },
          { label: 'Pending Entry', value: '—', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50', to: '/admin/bills' },
        ].map(({ label, value, icon: Icon, color, to }) => (
          <Link key={label} to={to} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Societies */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Your Societies</h2>
          <Link to="/admin/societies" className="text-sm text-primary-600 hover:underline">Manage →</Link>
        </div>

        {societies.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No societies yet.</p>
            <Link to="/admin/societies" className="btn-primary mt-3 inline-flex">Create Society</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {societies.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.city} · {s._count?.houses || 0} houses</p>
                </div>
                <Link to={`/admin/bills?societyId=${s.id}`} className="btn-primary text-xs px-3 py-1.5">
                  Create Bill
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Guide */}
      <div className="card bg-primary-50 border-primary-200">
        <h2 className="font-semibold text-primary-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Monthly Billing Workflow
        </h2>
        <ol className="text-sm text-primary-800 space-y-2">
          {[
            'Select Society + Month on Monthly Bills screen',
            'System auto-fills H.V from previous month\'s A.V',
            'Enter only the new A.V for each house',
            'System calculates UNIT, FALO, V, TOTAL instantly',
            'Review & Publish when ready',
            'Residents can view their bill immediately',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-5 h-5 bg-primary-700 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
