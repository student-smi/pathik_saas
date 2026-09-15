'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Society, House, BillEntry, MonthlyBill, BillStatus, BillEntryCalculationResult, CalcConfig } from '@/types'
import { calculateEntry, configsToMap } from '@/lib/calculation'
import { monthLabel } from '@/lib/bill-service'
import toast from 'react-hot-toast'
import {
  FileText, AlertTriangle, CheckCircle2, Send, Download,
  RefreshCw, Info, ChevronDown, Save, Plus, Eye
} from 'lucide-react'

const BIMONTHLY_PERIODS = [
  { value: 2, label: 'Jan - Feb' },
  { value: 4, label: 'Mar - Apr' },
  { value: 6, label: 'May - Jun' },
  { value: 8, label: 'Jul - Aug' },
  { value: 10, label: 'Sep - Oct' },
  { value: 12, label: 'Nov - Dec' }
]

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

function getPeriodName(m: number): string {
  const map: Record<number, string> = {
    1: 'Jan - Feb', 2: 'Jan - Feb',
    3: 'Mar - Apr', 4: 'Mar - Apr',
    5: 'May - Jun', 6: 'May - Jun',
    7: 'Jul - Aug', 8: 'Jul - Aug',
    9: 'Sep - Oct', 10: 'Sep - Oct',
    11: 'Nov - Dec', 12: 'Nov - Dec'
  }
  return map[m] || `Period ${m}`
}

function StatusBadge({ status }: { status: BillStatus }) {
  const map: Record<BillStatus, string> = { DRAFT: 'badge-draft', PUBLISHED: 'badge-published', CORRECTED: 'badge-corrected' }
  return <span className={map[status] || 'badge-draft'}>{status}</span>
}

function fmt(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—'
  return Number(val).toLocaleString()
}

const SAMPLE_SOCIETIES: Society[] = [
  {
    id: '1',
    name: 'Shree Krishna Residency',
    address: 'Sardar Patel Road',
    city: 'Ahmedabad',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    adminId: 'admin-1',
    admin: {} as any,
    houses: [] as any,
    monthlyBills: [] as any,
    calcConfigs: [] as any,
  },
  {
    id: '2',
    name: 'Ganesh Heights',
    address: 'CG Road',
    city: 'Ahmedabad',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    adminId: 'admin-1',
    admin: {} as any,
    houses: [] as any,
    monthlyBills: [] as any,
    calcConfigs: [] as any,
  },
]

const SAMPLE_CONFIGS = {
  FALO_RATE: { formula: 'FIXED:5', isActive: true },
  V: { formula: 'FIXED:600', isActive: true },
  AA: { formula: 'FIXED:100', isActive: true },
  B: { formula: '', isActive: false },
  DAN: { formula: '', isActive: false },
  WCH: { formula: 'FIXED:50', isActive: true },
}

function generateHouses(societyId: string, count: number): House[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${societyId}-house-${i + 1}`,
    houseNo: `${i + 1}`,
    floor: `${Math.floor(i / 4) + 1}`,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    societyId,
    society: {} as any,
    resident: null,
    billEntries: [] as any,
  }))
}

function BillRow({
  entry,
  societyId,
  onChange,
  configs,
}: {
  entry: BillEntry
  societyId: string
  onChange: (updated: BillEntry) => void
  configs: Record<string, any>
}) {
  const [av, setAv] = useState<string>(entry.av !== null && entry.av !== undefined ? String(entry.av) : '')
  const [hv, setHv] = useState<string>(String(entry.hv || 0))
  const [saving, setSaving] = useState(false)
  const [localCalc, setLocalCalc] = useState<BillEntryCalculationResult & { aa: number | null; b: number | null; dan: number | null; wch: number | null }>({
    unit: entry.unit ?? null as any,
    falo: entry.falo ?? null as any,
    v: entry.v || 600,
    total: entry.total ?? null as any,
    aa: entry.aa,
    b: entry.b,
    dan: entry.dan,
    wch: entry.wch,
    isNegative: false,
  })

  useEffect(() => {
    const avNum = parseFloat(av)
    const hvNum = parseFloat(hv)
    if (!isNaN(avNum) && !isNaN(hvNum)) {
      const result = calculateEntry(hvNum, avNum, configs)
      setLocalCalc(result)
    } else {
      setLocalCalc({
        unit: null as any,
        falo: null as any,
        v: localCalc.v || 600,
        total: null as any,
        aa: null,
        b: null,
        dan: null,
        wch: null,
        isNegative: false,
      })
    }
  }, [av, hv])

  const saveAv = useCallback(async () => {
    const avNum = parseFloat(av)
    if (isNaN(avNum)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/bills/entries/${encodeURIComponent(entry.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ societyId, av: avNum }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      const data = await res.json()
      const updated: BillEntry = data.entry
      onChange(updated)
      setAv(String(updated.av ?? ''))
      setHv(String(updated.hv ?? 0))
      toast.success(`House ${entry.house.houseNo} saved`, { duration: 1500 })
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [av, entry, societyId, onChange, hv])

  const saveHv = useCallback(async () => {
    const hvNum = parseFloat(hv)
    if (isNaN(hvNum)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/bills/entries/${encodeURIComponent(entry.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ societyId, hv: hvNum }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      const data = await res.json()
      const updated: BillEntry = data.entry
      onChange(updated)
      setHv(String(updated.hv ?? 0))
      toast.success('H.V updated')
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [hv, entry, societyId, onChange])

  const isNeg = localCalc.unit !== null && localCalc.unit !== undefined && localCalc.unit < 0
  const avEntered = av !== '' && !isNaN(parseFloat(av))

  return (
    <tr className={`${isNeg ? 'bg-red-50' : ''} hover:bg-gray-50/50`}>
      <td className="px-3 py-2 font-semibold text-gray-800 text-sm whitespace-nowrap">
        {entry.house.houseNo}
        {isNeg && <span className="ml-2 text-red-500 text-xs" title="Negative unit detected">⚠</span>}
      </td>

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

      <td className={`px-3 py-2 text-right text-sm font-mono ${isNeg ? 'negative-value' : ''}`}>{fmt(localCalc.unit)}</td>
      <td className="px-3 py-2 text-right text-sm text-gray-500">{fmt(localCalc.v)}</td>
      <td className={`px-3 py-2 text-right text-sm font-mono ${isNeg ? 'negative-value' : ''}`}>{fmt(localCalc.falo)}</td>
      <td className={`px-3 py-2 text-right text-sm font-semibold ${isNeg ? 'negative-value' : 'text-gray-900'}`}>{fmt(localCalc.total)}</td>

      <td className="px-3 py-2 text-right text-xs text-gray-400">{fmt(localCalc.aa)}</td>
      <td className="px-3 py-2 text-right text-xs text-gray-400">{fmt(localCalc.b)}</td>
      <td className="px-3 py-2 text-right text-xs text-gray-400">{fmt(localCalc.dan)}</td>
      <td className="px-3 py-2 text-right text-xs text-gray-400">{fmt(localCalc.wch)}</td>
    </tr>
  )
}

export default function MonthlyBillScreen() {
  const searchParams = useSearchParams()
  const [societies, setSocieties] = useState<Society[]>([])
  const [selectedSociety, setSelectedSociety] = useState<string>(searchParams.get('societyId') || '')
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState<number>(Number(searchParams.get('year')) || now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(Number(searchParams.get('month')) || now.getMonth() + 1)
  const [bill, setBill] = useState<MonthlyBill | null>(null)
  const [warning, setWarning] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loadingSocieties, setLoadingSocieties] = useState(true)
  const [configs, setConfigs] = useState<CalcConfig[]>([])

  const loadSocieties = useCallback(async () => {
    try {
      const res = await fetch('/api/societies')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSocieties(data.societies || [])
      if (!searchParams.get('societyId') && data.societies?.[0]) {
        setSelectedSociety(data.societies[0].id)
      } else if (searchParams.get('societyId')) {
        setSelectedSociety(searchParams.get('societyId') as string)
      }
    } catch {
      toast.error('Failed to load societies')
    } finally {
      setLoadingSocieties(false)
    }
  }, [searchParams])

  const loadConfigs = useCallback(async (socId: string) => {
    try {
      const res = await fetch(`/api/config?societyId=${encodeURIComponent(socId)}`)
      if (res.ok) {
        const d = await res.json()
        setConfigs(d.configs || [])
      }
    } catch {}
  }, [])

  const loadBill = useCallback(async () => {
    if (!selectedSociety) return
    setLoading(true)
    setBill(null)
    setWarning('')
    try {
      const res = await fetch(`/api/bills/${encodeURIComponent(selectedSociety)}/${selectedYear}/${selectedMonth}`)
      if (res.ok) {
        const data = await res.json()
        if (data.bill) {
          setBill(data.bill)
          if (data.missingPrevHouses?.length) {
            setWarning(`Houses ${data.missingPrevHouses.join(', ')} have no previous reading. Enter H.V manually.`)
          } else if (!data.hasPrevBill) {
            setWarning(`Previous month's bill was not found. Automatic H.V carry-forward is unavailable.`)
          }
        }
      }
    } catch (e) {
      // 404 = bill does not exist yet - fine
    } finally {
      setLoading(false)
    }
  }, [selectedSociety, selectedYear, selectedMonth])

  useEffect(() => { loadSocieties() }, [loadSocieties])
  useEffect(() => { if (selectedSociety) loadConfigs(selectedSociety) }, [selectedSociety, loadConfigs])
  useEffect(() => { if (selectedSociety) loadBill() }, [loadBill])

  const createBill = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ societyId: selectedSociety, year: selectedYear, month: selectedMonth }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Creation failed')
      }
      const result = await res.json()
      setBill(result.bill)
      if (!result.hasPrevBill) {
        setWarning(`Previous month's bill was not found. Automatic H.V carry-forward is unavailable. Please initialize the readings manually.`)
      } else if (result.missingPrevHouses?.length > 0) {
        setWarning(`Houses ${result.missingPrevHouses.join(', ')} have no previous reading. Enter H.V manually.`)
      } else {
        setWarning('')
        toast.success('Bill created — H.V auto-filled from last month')
      }
    } catch (err: any) {
      toast.error(err.message || 'Creation failed')
    } finally {
      setCreating(false)
    }
  }

  const publishBill = async () => {
    if (!bill) return
    const incomplete = bill.entries.filter(e => e.av === null)
    if (incomplete.length > 0) {
      toast.error(`Please enter A.V for all ${incomplete.length} houses before publishing`)
      return
    }
    setPublishing(true)
    try {
      const res = await fetch(`/api/bills/${encodeURIComponent(selectedSociety)}/${selectedYear}/${selectedMonth}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      setBill(data.bill)
      toast.success('Bill published! Residents can now see it.')
    } catch (err: any) {
      toast.error(err.message || 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const unpublish = async () => {
    if (!bill) return
    try {
      const res = await fetch(`/api/bills/${encodeURIComponent(selectedSociety)}/${selectedYear}/${selectedMonth}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      setBill(data.bill)
      toast.success('Bill reverted to Draft')
    } catch (err: any) { toast.error(err.message || 'Failed to unpublish') }
  }

  const syncHouses = async () => {
    if (!bill) return
    try {
      toast('Re-creating bill to sync new houses...', { icon: '🔄' })
      await createBill()
    } catch (err) {
      toast.error('Sync failed')
    }
  }

  const deleteBillAndReset = async () => {
    if (!bill) return
    if (!confirm(`Delete ${MONTHS[selectedMonth - 1]} ${selectedYear} bill and recreate it fresh?\n\nThis will re-fetch H.V from the previous month's A.V.`)) return
    try {
      setBill(null)
      setWarning('')
      toast('Bill deleted. Creating fresh bill...', { icon: '🔄' })
      setTimeout(async () => {
        await createBill()
      }, 500)
    } catch (err) {
      toast.error('Delete failed')
    }
  }

  const updateEntry = (updated: BillEntry) => {
    setBill(b => b ? ({ ...b, entries: b.entries.map(e => e.id === updated.id ? { ...e, ...updated } : e) }) : b)
  }

  const downloadExcel = () => {
    if (!bill) return
    const params = new URLSearchParams({ societyId: selectedSociety, year: String(selectedYear), month: String(selectedMonth) })
    window.location.href = `/api/export/excel?${params.toString()}`
  }
  const downloadPdf = () => {
    if (!bill) return
    const params = new URLSearchParams({ societyId: selectedSociety, year: String(selectedYear), month: String(selectedMonth) })
    window.location.href = `/api/export/pdf?${params.toString()}`
  }

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() + 1]
  const completedCount = bill?.entries.filter(e => e.av !== null).length || 0
  const totalCount = bill?.entries.length || 0
  const negativeCount = bill?.entries.filter(e => e.isNegative).length || 0
  const configMap = configsToMap(configs)

  if (loadingSocieties) return <div className="flex items-center justify-center h-48"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title text-2xl font-bold text-gray-900">Monthly Bill Entry</h1>
        <p className="text-gray-500 text-sm">Create and manage monthly water bills</p>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col md:flex-row md:items-end flex-wrap gap-3">
          <div className="w-full sm:w-auto min-w-[180px] flex-1 sm:flex-none">
            <label className="label">Society</label>
            <select className="input w-full" value={selectedSociety} onChange={e => setSelectedSociety(e.target.value)}>
              {societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <label className="label">Year</label>
            <select className="input w-full sm:w-28" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <label className="label">Billing Period</label>
            <select className="input w-full sm:w-44" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {BIMONTHLY_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {!bill && !loading && selectedSociety && (
            <button onClick={createBill} disabled={creating} className="btn-primary w-full sm:w-auto mt-2 sm:mt-0">
              {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Bill
            </button>
          )}

          {bill && (
            <div className="flex gap-2 flex-wrap items-center w-full md:w-auto mt-2 md:mt-0">
              {bill.status === 'DRAFT' && (
                <button onClick={publishBill} disabled={publishing} className="btn-success btn-sm sm:btn-md">
                  {publishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publish
                </button>
              )}
              {(bill.status === 'PUBLISHED' || bill.status === 'CORRECTED') && (
                <button onClick={unpublish} className="btn-secondary btn-sm">Unpublish</button>
              )}
              <button onClick={syncHouses} className="btn-secondary btn-sm" title="Add new houses that are missing from this bill">
                <RefreshCw className="w-3.5 h-3.5" /> Sync Houses
              </button>
              {bill.status !== 'PUBLISHED' && (
                <button onClick={deleteBillAndReset} className="btn-danger btn-sm">
                  🗑 Delete &amp; Recreate
                </button>
              )}
              <button onClick={downloadExcel} className="btn-secondary btn-sm sm:btn-md">
                <Download className="w-4 h-4" /> Excel
              </button>
              <button onClick={downloadPdf} className="btn-secondary btn-sm sm:btn-md">
                <Download className="w-4 h-4" /> PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {warning && (
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{warning}</p>
        </div>
      )}

      {loading && (
        <div className="card flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-500">Loading bill...</span>
        </div>
      )}

      {!loading && !bill && selectedSociety && (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No bill for {getPeriodName(selectedMonth)} {selectedYear}</p>
          <p className="text-gray-400 text-sm mt-1">Click &quot;Create Bill&quot; to start. H.V will be auto-filled from last month.</p>
        </div>
      )}

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

      {bill && (
        <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>H.V</strong> is automatically filled from last month&apos;s A.V (green = auto-filled, amber = manual entry needed).
            Only enter <strong>A.V</strong> — UNIT, FALO, and TOTAL calculate instantly using real calculation engine.
            Press Tab or click away to save.
          </span>
        </div>
      )}

      {bill && bill.entries.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
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
                    configs={configMap}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-3 py-3">
            <div className="flex gap-8 text-sm">
              {[
                { label: 'Total UNIT', key: 'unit' },
                { label: 'Total FALO', key: 'falo' },
                { label: 'Total TOTAL', key: 'total' },
              ].map(({ label, key }) => {
                const sum = bill.entries.reduce((a, e) => a + ((e as any)[key] || 0), 0)
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
