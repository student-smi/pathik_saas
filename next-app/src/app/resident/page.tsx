'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { Droplets, AlertTriangle, ChevronRight, Clock } from 'lucide-react'
import type { BillEntry, MonthlyBill, BillStatus } from '@/types'
import toast from 'react-hot-toast'

function getPeriodName(m: number): string {
  const map: Record<number, string> = {
    1: 'January - February', 2: 'January - February',
    3: 'March - April', 4: 'March - April',
    5: 'May - June', 6: 'May - June',
    7: 'July - August', 8: 'July - August',
    9: 'September - October', 10: 'September - October',
    11: 'November - December', 12: 'November - December'
  }
  return map[m] || `Period ${m}`
}

function fmt(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—'
  return Number(val).toLocaleString()
}

interface BillCardProps {
  entry: BillEntry & { monthlyBill: MonthlyBill }
  isCurrent: boolean
}

function BillCard({ entry, isCurrent }: BillCardProps) {
  const m = entry.monthlyBill
  const isNeg = (entry.unit ?? 0) < 0

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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
        {[
          { label: 'H.V', value: fmt(entry.hv) },
          { label: 'A.V', value: fmt(entry.av) },
          { label: 'UNIT', value: fmt(entry.unit), negative: isNeg },
          { label: 'V', value: fmt(entry.v) },
          { label: 'FALO', value: fmt(entry.falo), negative: isNeg },
          { label: 'TOTAL', value: fmt(entry.total), highlight: true, negative: isNeg },
        ].map(({ label, value, highlight, negative }) => (
          <div key={label} className={`rounded-xl p-2.5 sm:p-3 text-center transition-all ${highlight ? (negative ? 'bg-red-100 border border-red-200' : 'bg-primary-100 border border-primary-200') : 'bg-white border border-gray-100 shadow-sm'}`}>
            <p className="text-[11px] sm:text-xs text-gray-500 font-semibold mb-0.5">{label}</p>
            <p className={`text-base sm:text-lg font-bold ${highlight ? (negative ? 'text-red-700' : 'text-primary-800') : negative && (label === 'UNIT' || label === 'FALO') ? 'text-red-600' : 'text-gray-900'}`}>
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
        <Link href={`/resident/bill/${entry.id}`} className="mt-3 flex items-center gap-1 text-xs text-primary-600 hover:underline">
          View full detail <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}

const sampleCurrentBill: BillEntry & { monthlyBill: MonthlyBill } = {
  id: 'bill-1',
  createdAt: new Date('2026-08-15'),
  updatedAt: new Date('2026-08-15'),
  monthlyBillId: 'mb-1',
  houseId: 'house-10',
  hv: 1250,
  av: 1320,
  hvAutoFilled: true,
  unit: 70,
  falo: 350,
  v: 100,
  total: 450,
  aa: null,
  b: null,
  dan: null,
  wch: null,
  isNegative: false,
  isManualHv: false,
  house: {} as any,
  monthlyBill: {
    id: 'mb-1',
    year: 2026,
    month: 7,
    status: 'PUBLISHED',
    notes: null,
    createdAt: new Date('2026-08-01'),
    updatedAt: new Date('2026-08-15'),
    publishedAt: new Date('2026-08-15'),
    societyId: 'soc-1',
    society: {} as any,
    entries: []
  }
}

const sampleHistoryBills: (BillEntry & { monthlyBill: MonthlyBill })[] = [
  {
    id: 'bill-2',
    createdAt: new Date('2026-06-15'),
    updatedAt: new Date('2026-06-15'),
    monthlyBillId: 'mb-2',
    houseId: 'house-10',
    hv: 1180,
    av: 1250,
    hvAutoFilled: true,
    unit: 70,
    falo: 350,
    v: 100,
    total: 450,
    aa: null,
    b: null,
    dan: null,
    wch: null,
    isNegative: false,
    isManualHv: false,
    house: {} as any,
    monthlyBill: {
      id: 'mb-2',
      year: 2026,
      month: 5,
      status: 'CORRECTED',
      notes: null,
      createdAt: new Date('2026-06-01'),
      updatedAt: new Date('2026-06-20'),
      publishedAt: new Date('2026-06-15'),
      societyId: 'soc-1',
      society: {} as any,
      entries: []
    }
  },
  {
    id: 'bill-3',
    createdAt: new Date('2026-04-15'),
    updatedAt: new Date('2026-04-15'),
    monthlyBillId: 'mb-3',
    houseId: 'house-10',
    hv: 1100,
    av: 1080,
    hvAutoFilled: true,
    unit: -20,
    falo: -100,
    v: 100,
    total: 0,
    aa: null,
    b: null,
    dan: null,
    wch: null,
    isNegative: true,
    isManualHv: false,
    house: {} as any,
    monthlyBill: {
      id: 'mb-3',
      year: 2026,
      month: 3,
      status: 'PUBLISHED',
      notes: null,
      createdAt: new Date('2026-04-01'),
      updatedAt: new Date('2026-04-15'),
      publishedAt: new Date('2026-04-15'),
      societyId: 'soc-1',
      society: {} as any,
      entries: []
    }
  }
]

export default function ResidentDashboard() {
  const { user } = useAuth()
  const [bills, setBills] = useState<(BillEntry & { monthlyBill: MonthlyBill })[]>([])
  const [current, setCurrent] = useState<(BillEntry & { monthlyBill: MonthlyBill }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [houseNo, setHouseNo] = useState<string>('—')
  const [societyName, setSocietyName] = useState<string>('—')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/bills')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setBills(data.bills || [])
      setCurrent(data.current || null)
      setHouseNo(data.houseNo || '—')
      setSocietyName(data.societyName || '—')
    } catch {
      toast.error('Failed to load bills')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const pastBills = bills.filter(e => !current || e.id !== current.id)
  const displayName = user?.email?.split('@')[0] || 'Resident'

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-br from-primary-800 to-primary-700 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-lg">Welcome{`, ${displayName}`}</p>
            <p className="text-primary-200 text-sm">
              House No: {houseNo} — {societyName}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Current Bill</h2>
        {!current && (
          <div className="card text-center py-8">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No published bill available yet. Please check back later.</p>
          </div>
        )}
        {current && <BillCard entry={current} isCurrent />}
      </div>

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
