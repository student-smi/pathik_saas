import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { History, FileText, Download, Eye } from 'lucide-react'

function getPeriodName(m) {
  const map = {
    1: 'Jan - Feb', 2: 'Jan - Feb',
    3: 'Mar - Apr', 4: 'Mar - Apr',
    5: 'May - Jun', 6: 'May - Jun',
    7: 'Jul - Aug', 8: 'Jul - Aug',
    9: 'Sep - Oct', 10: 'Sep - Oct',
    11: 'Nov - Dec', 12: 'Nov - Dec'
  }
  return map[m] || `Period ${m}`
}

function StatusBadge({ status }) {
  const map = { DRAFT: 'badge-draft', PUBLISHED: 'badge-published', CORRECTED: 'badge-corrected' }
  return <span className={map[status] || 'badge-draft'}>{status}</span>
}

export default function BillHistory() {
  const [societies, setSocieties] = useState([])
  const [selectedSociety, setSelectedSociety] = useState('')
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.get('/societies').then(r => { setSocieties(r.data); if (r.data[0]) setSelectedSociety(r.data[0].id) }) }, [])
  useEffect(() => {
    if (!selectedSociety) return
    setLoading(true)
    api.get(`/bills?societyId=${selectedSociety}`).then(r => setBills(r.data)).finally(() => setLoading(false))
  }, [selectedSociety])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bill History</h1>
        <p className="text-gray-500 text-sm">All historical bills — previous months are preserved and never overwritten</p>
      </div>

      <div>
        <label className="label">Select Society</label>
        <select className="input max-w-xs" value={selectedSociety} onChange={e => setSelectedSociety(e.target.value)}>
          {societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {!loading && bills.length === 0 && (
        <div className="card text-center py-12">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No bills yet for this society.</p>
        </div>
      )}

      <div className="space-y-2">
        {bills.map(b => (
          <div key={b.id} className="card flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{getPeriodName(b.month)} {b.year}</p>
                <p className="text-xs text-gray-500">{b._count?.entries || 0} houses</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={b.status} />
              {b.publishedAt && (
                <span className="text-xs text-gray-400">
                  Published {new Date(b.publishedAt).toLocaleDateString()}
                </span>
              )}
              <Link to={`/admin/bills?societyId=${selectedSociety}&year=${b.year}&month=${b.month}`} className="btn-secondary text-xs px-2 py-1.5">
                <Eye className="w-3.5 h-3.5" /> View
              </Link>
              <button onClick={() => window.open(`/api/export/excel/${b.id}`, '_blank')} className="btn-secondary text-xs px-2 py-1.5" title="Export Excel">
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
