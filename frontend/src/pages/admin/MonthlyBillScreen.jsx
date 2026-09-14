import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import {
  FileText, AlertTriangle, CheckCircle2, Send, Download,
  RefreshCw, Info, ChevronDown, Save, Plus
} from 'lucide-react'

const BIMONTHLY_PERIODS = [
  { value: 2, label: 'Jan - Feb' },
  { value: 4, label: 'Mar - Apr' },
  { value: 6, label: 'May - Jun' },
  { value: 8, label: 'Jul - Aug' },
  { value: 10, label: 'Sep - Oct' },
  { value: 12, label: 'Nov - Dec' }
]

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

function fmt(val) {
  if (val === null || val === undefined) return '—'
  return Number(val).toLocaleString()
}

/**
 * Single row for one house entry.
 * Admin types A.V → everything updates in real-time.
 */
function BillRow({ entry, societyId, onChange }) {
  const [av, setAv] = useState(entry.av !== null && entry.av !== undefined ? String(entry.av) : '')
  const [hv, setHv] = useState(String(entry.hv || 0))
  const [saving, setSaving] = useState(false)
  const [localCalc, setLocalCalc] = useState({
    unit: entry.unit, falo: entry.falo, v: entry.v || 600, total: entry.total
  })

  // Live preview: recalculate client-side as admin types
  useEffect(() => {
    const avNum = parseFloat(av)
    const hvNum = parseFloat(hv)
    if (!isNaN(avNum) && !isNaN(hvNum)) {
      const unit = hvNum - avNum
      const falo = unit * 5
      const v = localCalc.v || 600
      const total = v + falo
      setLocalCalc({ unit, falo, v, total })
    } else {
      setLocalCalc({ unit: null, falo: null, v: localCalc.v || 600, total: null })
    }
  }, [av, hv])

  // Save A.V to backend
  const saveAv = useCallback(async () => {
    const avNum = parseFloat(av)
    if (isNaN(avNum)) return
    setSaving(true)
    try {
      const res = await api.patch(`/bills/entry/${entry.id}/av`, { av: avNum, societyId })
      onChange(res.data)
      toast.success(`House ${entry.house.houseNo} saved`, { duration: 1500 })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [av, entry.id, entry.house.houseNo, societyId, onChange])

  // Save manual H.V
  const saveHv = useCallback(async () => {
    const hvNum = parseFloat(hv)
    if (isNaN(hvNum)) return
    try {
      const res = await api.patch(`/bills/entry/${entry.id}/hv`, { hv: hvNum, societyId })
      onChange(res.data)
      toast.success('H.V updated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    }
  }, [hv, entry.id, societyId, onChange])

  const isNeg = localCalc.unit !== null && localCalc.unit < 0
  const avEntered = av !== '' && !isNaN(parseFloat(av))

  return (
    <tr className={`${isNeg ? 'bg-red-50' : ''} hover:bg-gray-50/50`}>
      {/* House No */}
      <td className="px-3 py-2 font-semibold text-gray-800 text-sm whitespace-nowrap">
        {entry.house.houseNo}
        {isNeg && <span className="ml-2 text-red-500 text-xs" title="Negative unit detected">⚠</span>}
      </td>

      {/* H.V — auto-filled or manually editable */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <input
            className={`w-24 text-sm px-2 py-1 rounded border text-right
              ${entry.hvAutoFilled
                ? 'border-green-300 bg-green-50 text-green-800 font-medium'
                : 'border-amber-300 bg-amber-50'}`}
            value={hv}
            onChange={e => setHv(e.target.value)}
            onBlur={saveHv}
            title={entry.hvAutoFilled ? 'Auto-filled from previous month A.V' : 'Enter manually — no previous month found'}
          />
          {entry.hvAutoFilled
            ? <span className="text-green-500 text-xs" title="Auto-filled">✓</span>
            : <span className="text-amber-500 text-xs" title="Manual entry required">M</span>
          }
        </div>
      </td>

      {/* A.V — primary input */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <input
            className={`w-28 text-sm px-2 py-1.5 rounded border font-medium text-right
              ${avEntered ? 'border-primary-400 bg-primary-50 text-primary-900' : 'border-gray-300 bg-white'}`}
            value={av}
            onChange={e => setAv(e.target.value)}
            onBlur={saveAv}
            placeholder="Enter A.V"
            autoComplete="off"
          />
          {saving && <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />}
        </div>
      </td>

      {/* Calculated fields */}
      <td className={`px-3 py-2 text-right text-sm font-mono ${isNeg ? 'negative-value' : ''}`}>{fmt(localCalc.unit)}</td>
      <td className="px-3 py-2 text-right text-sm text-gray-500">{fmt(localCalc.v)}</td>
      <td className={`px-3 py-2 text-right text-sm font-mono ${isNeg ? 'negative-value' : ''}`}>{fmt(localCalc.falo)}</td>
      <td className={`px-3 py-2 text-right text-sm font-semibold ${isNeg ? 'negative-value' : 'text-gray-900'}`}>{fmt(localCalc.total)}</td>

      {/* Configurable fields (shown as — until configured) */}
      <td className="px-3 py-2 text-right text-xs text-gray-400">{fmt(entry.aa)}</td>
      <td className="px-3 py-2 text-right text-xs text-gray-400">{fmt(entry.b)}</td>
      <td className="px-3 py-2 text-right text-xs text-gray-400">{fmt(entry.dan)}</td>
      <td className="px-3 py-2 text-right text-xs text-gray-400">{fmt(entry.wch)}</td>
    </tr>
  )
}

export default function MonthlyBillScreen() {
  const [searchParams] = useSearchParams()
  const [societies, setSocieties] = useState([])
  const [selectedSociety, setSelectedSociety] = useState(searchParams.get('societyId') || '')
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [bill, setBill] = useState(null)
  const [warning, setWarning] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    api.get('/societies').then(r => {
      setSocieties(r.data)
      if (!selectedSociety && r.data[0]) setSelectedSociety(r.data[0].id)
    })
  }, [])

  // Auto-load bill when society/year/month changes
  useEffect(() => {
    if (!selectedSociety) return
    setLoading(true)
    setBill(null)
    setWarning('')
    api.get(`/bills/${selectedSociety}/${selectedYear}/${selectedMonth}`)
      .then(r => setBill(r.data))
      .catch(err => {
        if (err.response?.status !== 404) toast.error('Error loading bill')
      })
      .finally(() => setLoading(false))
  }, [selectedSociety, selectedYear, selectedMonth])

  const createBill = async () => {
    setCreating(true)
    try {
      const res = await api.post('/bills/create', {
        societyId: selectedSociety,
        year: selectedYear,
        month: selectedMonth
      })
      setBill(res.data.bill)

      if (!res.data.hasPrevBill) {
        setWarning(`Previous month's bill (${res.data.prevMonth}) was not found. Automatic H.V carry-forward is unavailable. Please initialize the readings manually.`)
      } else if (res.data.missingPrevHouses?.length > 0) {
        setWarning(`Houses ${res.data.missingPrevHouses.join(', ')} have no previous reading. Enter H.V manually.`)
      } else {
        setWarning('')
        toast.success(`Bill created — H.V auto-filled from ${res.data.prevMonth}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Creation failed')
    } finally {
      setCreating(false)
    }
  }

  const publishBill = async () => {
    if (!bill) return
    // Check all entries have A.V
    const incomplete = bill.entries.filter(e => e.av === null)
    if (incomplete.length > 0) {
      toast.error(`Please enter A.V for all ${incomplete.length} houses before publishing`)
      return
    }
    setPublishing(true)
    try {
      const res = await api.post(`/bills/${bill.id}/publish`)
      setBill(res.data)
      toast.success('Bill published! Residents can now see it.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const unpublish = async () => {
    if (!bill) return
    try {
      await api.post(`/bills/${bill.id}/unpublish`)
      setBill(b => ({ ...b, status: 'DRAFT' }))
      toast.success('Bill reverted to Draft')
    } catch (err) { toast.error('Failed to unpublish') }
  }

  // Sync — add any new houses to this bill that are missing
  const syncHouses = async () => {
    if (!bill) return
    try {
      const res = await api.post(`/bills/${bill.id}/sync-houses`)
      if (res.data.added.length === 0) {
        toast('All houses already in bill', { icon: '✅' })
      } else {
        setBill(res.data.bill)
        toast.success(`${res.data.added.length} naya ghar add hua: House ${res.data.added.join(', ')}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed')
    }
  }

  // Delete current bill and immediately recreate — gets fresh HV from previous month
  const deleteBillAndReset = async () => {
    if (!bill) return
    if (!confirm(`Delete ${MONTHS[selectedMonth - 1]} ${selectedYear} bill and recreate it fresh?\n\nThis will re-fetch H.V from the previous month's A.V.`)) return
    try {
      await api.delete(`/bills/${bill.id}`)
      setBill(null)
      setWarning('')
      toast('Bill deleted. Creating fresh bill...', { icon: '🔄' })
      // Small delay then recreate
      setTimeout(async () => {
        try {
          const res = await api.post('/bills/create', {
            societyId: selectedSociety,
            year: selectedYear,
            month: selectedMonth
          })
          setBill(res.data.bill)
          if (!res.data.hasPrevBill) {
            setWarning(`Previous month bill not found. Enter H.V manually.`)
          } else {
            toast.success(`Fresh bill created — H.V auto-filled from ${res.data.prevMonth}`)
          }
        } catch (err) {
          toast.error(err.response?.data?.error || 'Recreate failed')
        }
      }, 500)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  const updateEntry = (updated) => {
    setBill(b => ({ ...b, entries: b.entries.map(e => e.id === updated.id ? { ...e, ...updated } : e) }))
  }

  const downloadExcel = () => { if (bill) window.open(`/api/export/excel/${bill.id}`, '_blank') }
  const downloadPdf = () => { if (bill) window.open(`/api/export/pdf/${bill.id}`, '_blank') }

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() + 1]
  const completedCount = bill?.entries.filter(e => e.av !== null).length || 0
  const totalCount = bill?.entries.length || 0
  const negativeCount = bill?.entries.filter(e => e.isNegative).length || 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monthly Bill Entry</h1>
        <p className="text-gray-500 text-sm">Create and manage monthly water bills</p>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Society</label>
            <select className="input w-48" value={selectedSociety} onChange={e => setSelectedSociety(e.target.value)}>
              {societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select className="input w-28" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Billing Period</label>
            <select className="input w-44" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {BIMONTHLY_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {!bill && !loading && selectedSociety && (
            <button onClick={createBill} disabled={creating} className="btn-primary">
              {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Bill
            </button>
          )}

          {bill && (
            <div className="flex gap-2 flex-wrap">
              {bill.status === 'DRAFT' && (
                <button onClick={publishBill} disabled={publishing} className="btn-success">
                  {publishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publish
                </button>
              )}
              {(bill.status === 'PUBLISHED' || bill.status === 'CORRECTED') && (
                <button onClick={unpublish} className="btn-secondary text-xs">Unpublish</button>
              )}
              {/* Sync — adds newly created houses into this bill */}
              <button onClick={syncHouses} className="btn-secondary text-xs" title="Add new houses that are missing from this bill">
                <RefreshCw className="w-3.5 h-3.5" /> Sync Houses
              </button>
              {bill.status !== 'PUBLISHED' && (
                <button onClick={deleteBillAndReset} className="btn-danger text-xs">
                  🗑 Delete & Recreate
                </button>
              )}
              <button onClick={downloadExcel} className="btn-secondary">
                <Download className="w-4 h-4" /> Excel
              </button>
              <button onClick={downloadPdf} className="btn-secondary">
                <Download className="w-4 h-4" /> PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      {warning && (
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{warning}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-500">Loading bill...</span>
        </div>
      )}

      {/* No bill yet */}
      {!loading && !bill && selectedSociety && (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No bill for {getPeriodName(selectedMonth)} {selectedYear}</p>
          <p className="text-gray-400 text-sm mt-1">Click "Create Bill" to start. H.V will be auto-filled from last month.</p>
        </div>
      )}

      {/* Bill summary bar */}
      {bill && (
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <StatusBadge status={bill.status} />
            <span className="text-sm text-gray-600 font-semibold">{getPeriodName(bill.month)} {bill.year}</span>
          </div>
          <span className="text-sm text-gray-500">
            {completedCount}/{totalCount} entries complete
          </span>
          {negativeCount > 0 && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {negativeCount} negative reading{negativeCount > 1 ? 's' : ''}
            </span>
          )}
          <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-48">
            <div className="bg-primary-600 h-1.5 rounded-full transition-all" style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Info banner about H.V carry-forward */}
      {bill && (
        <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>H.V</strong> is automatically filled from last month's A.V (green = auto-filled, amber = manual entry needed).
            Only enter <strong>A.V</strong> — UNIT, FALO, and TOTAL calculate instantly.
            Press Tab or click away to save.
          </span>
        </div>
      )}

      {/* Bill Table */}
      {bill && bill.entries.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-800 text-white">
                  <th className="px-3 py-3 text-left font-semibold">Home No.</th>
                  <th className="px-3 py-3 text-left font-semibold">
                    H.V <span className="text-primary-300 text-xs font-normal">(prev A.V)</span>
                  </th>
                  <th className="px-3 py-3 text-left font-semibold">
                    A.V <span className="text-primary-300 text-xs font-normal">(enter)</span>
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">UNIT</th>
                  <th className="px-3 py-3 text-right font-semibold">V</th>
                  <th className="px-3 py-3 text-right font-semibold">FALO</th>
                  <th className="px-3 py-3 text-right font-semibold">TOTAL</th>
                  <th className="px-3 py-3 text-right font-semibold text-primary-300">AA</th>
                  <th className="px-3 py-3 text-right font-semibold text-primary-300">B</th>
                  <th className="px-3 py-3 text-right font-semibold text-primary-300">DAN</th>
                  <th className="px-3 py-3 text-right font-semibold text-primary-300">WCH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bill.entries.map(entry => (
                  <BillRow
                    key={entry.id}
                    entry={entry}
                    societyId={selectedSociety}
                    onChange={updateEntry}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-3 py-3">
            <div className="flex gap-8 text-sm">
              {[
                { label: 'Total UNIT', key: 'unit' },
                { label: 'Total FALO', key: 'falo' },
                { label: 'Total TOTAL', key: 'total' },
              ].map(({ label, key }) => {
                const sum = bill.entries.reduce((a, e) => a + (e[key] || 0), 0)
                return (
                  <div key={key}>
                    <span className="text-gray-500">{label}: </span>
                    <span className={`font-bold ${sum < 0 ? 'text-red-600' : 'text-gray-900'}`}>{sum.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// End of MonthlyBillScreen
