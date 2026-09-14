import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { Droplets, AlertTriangle, ChevronRight, Clock } from 'lucide-react'

function getPeriodName(m) {
  const map = {
    1: 'January - February', 2: 'January - February',
    3: 'March - April', 4: 'March - April',
    5: 'May - June', 6: 'May - June',
    7: 'July - August', 8: 'July - August',
    9: 'September - October', 10: 'September - October',
    11: 'November - December', 12: 'November - December'
  }
  return map[m] || `Period ${m}`
}

function fmt(val) {
  if (val === null || val === undefined) return '—'
  return Number(val).toLocaleString()
}

function BillCard({ entry, isCurrent }) {
  const m = entry.monthlyBill
  const isNeg = entry.unit < 0

  return (
    <div className={`card ${isCurrent ? 'border-primary-300 bg-primary-50' : ''}`}>
      {isCurrent && (
        <div className="flex items-center gap-2 mb-3">
          <span className="badge-published">Current Bill</span>
          <span className="text-xs text-gray-500 font-medium">{getPeriodName(m.month)} {m.year}</span>
          {m.status === 'CORRECTED' && <span className="badge-corrected">Corrected</span>}
        </div>
      )}
      {!isCurrent && (
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-700">{getPeriodName(m.month)} {m.year}</span>
          {m.status === 'CORRECTED' && <span className="badge-corrected">Corrected</span>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'H.V', value: fmt(entry.hv) },
          { label: 'A.V', value: fmt(entry.av) },
          { label: 'UNIT', value: fmt(entry.unit), negative: isNeg },
          { label: 'V', value: fmt(entry.v) },
          { label: 'FALO', value: fmt(entry.falo), negative: isNeg },
          { label: 'TOTAL', value: fmt(entry.total), highlight: true, negative: isNeg },
        ].map(({ label, value, highlight, negative }) => (
          <div key={label} className={`rounded-lg p-3 text-center ${highlight ? (negative ? 'bg-red-100' : 'bg-primary-100') : 'bg-white border border-gray-100'}`}>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className={`text-lg font-bold ${highlight ? (negative ? 'text-red-700' : 'text-primary-800') : negative && (label === 'UNIT' || label === 'FALO') ? 'text-red-600' : 'text-gray-900'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {isNeg && (
        <div className="mt-3 flex gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Negative reading detected — your current reading is lower than the previous reading.
        </div>
      )}

      {!isCurrent && (
        <Link to={`/resident/bill/${entry.id}`} className="mt-3 flex items-center gap-1 text-xs text-primary-600 hover:underline">
          View full detail <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}

export default function ResidentDashboard() {
  const { user } = useAuth()
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [noBill, setNoBill] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/portal/bills/current').then(r => setCurrent(r.data)).catch(err => {
        if (err.response?.status === 404) setNoBill(true)
      }),
      api.get('/portal/bills').then(r => setHistory(r.data))
    ]).finally(() => setLoading(false))
  }, [])

  const pastBills = history.filter(e => !current || e.id !== current.id)

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card bg-gradient-to-br from-primary-800 to-primary-700 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-lg">Welcome{user?.resident?.name ? `, ${user.resident.name}` : ''}</p>
            <p className="text-primary-200 text-sm">
              House No: {user?.resident?.houseNo} — {user?.resident?.society}
            </p>
          </div>
        </div>
      </div>

      {/* Current bill */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Current Bill</h2>
        {noBill && !current && (
          <div className="card text-center py-8">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No published bill available yet. Please check back later.</p>
          </div>
        )}
        {current && <BillCard entry={current} isCurrent />}
      </div>

      {/* Previous bills */}
      {pastBills.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Previous Bills</h2>
          <div className="space-y-3">
            {pastBills.map(entry => (
              <BillCard key={entry.id} entry={entry} isCurrent={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
