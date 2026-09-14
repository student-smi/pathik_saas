import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/axios'
import { ArrowLeft, AlertTriangle, Printer } from 'lucide-react'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

function Row({ label, value, isNeg, highlight }) {
  return (
    <div className={`flex items-center justify-between py-3 border-b border-gray-100 ${highlight ? 'font-bold' : ''}`}>
      <span className={`text-sm ${highlight ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm font-mono ${isNeg ? 'text-red-600 font-bold' : highlight ? 'text-primary-800 text-base' : 'text-gray-900'}`}>
        {value !== null && value !== undefined ? Number(value).toLocaleString() : '—'}
      </span>
    </div>
  )
}

export default function ResidentBillDetail() {
  const { entryId } = useParams()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/portal/bills/${entryId}`)
      .then(r => setEntry(r.data))
      .catch(err => setError(err.response?.data?.error || 'Bill not found'))
      .finally(() => setLoading(false))
  }, [entryId])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>
  if (error) return (
    <div className="card text-center py-10">
      <p className="text-red-500 mb-4">{error}</p>
      <Link to="/resident" className="btn-secondary inline-flex"><ArrowLeft className="w-4 h-4" /> Back</Link>
    </div>
  )

  const m = entry.monthlyBill
  const isNeg = entry.unit < 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/resident" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{MONTHS[m.month - 1]} {m.year}</h1>
          <p className="text-sm text-gray-500">House {entry.house.houseNo} · {m.society?.name}</p>
        </div>
        <button onClick={() => window.print()} className="ml-auto btn-secondary text-xs"><Printer className="w-3.5 h-3.5" /> Print</button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Bill Details</h2>
          <div className="flex gap-2">
            <span className={`${m.status === 'PUBLISHED' ? 'badge-published' : m.status === 'CORRECTED' ? 'badge-corrected' : 'badge-draft'}`}>{m.status}</span>
            {m.status === 'CORRECTED' && <span className="text-xs text-amber-600">This bill has been updated by admin</span>}
          </div>
        </div>

        <Row label="House No." value={entry.house.houseNo} />
        <Row label="H.V (Previous Reading)" value={entry.hv} />
        <Row label="A.V (Current Reading)" value={entry.av} />
        <Row label="UNIT (H.V − A.V)" value={entry.unit} isNeg={isNeg} />
        <Row label="V (Fixed Charge)" value={entry.v} />
        <Row label="FALO (UNIT × 5)" value={entry.falo} isNeg={isNeg} />
        {entry.aa !== null && <Row label="AA" value={entry.aa} />}
        {entry.b !== null && <Row label="B" value={entry.b} />}
        {entry.dan !== null && <Row label="DAN" value={entry.dan} />}
        {entry.wch !== null && <Row label="WCH" value={entry.wch} />}
        <Row label="TOTAL" value={entry.total} isNeg={isNeg} highlight />

        {isNeg && (
          <div className="mt-4 flex gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>Your current reading (A.V) is higher than the previous reading (H.V), resulting in a negative UNIT. This has been preserved as recorded. Please contact your society admin if this seems incorrect.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        {m.publishedAt ? `Published on ${new Date(m.publishedAt).toLocaleDateString()}` : ''}
      </p>
    </div>
  )
}
