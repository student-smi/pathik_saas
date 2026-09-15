'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Printer } from 'lucide-react'
import type { BillEntry, MonthlyBill, House, Society } from '@/types'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

interface RowProps {
  label: string
  value: number | null | undefined
  isNeg?: boolean
  highlight?: boolean
}

function Row({ label, value, isNeg, highlight }: RowProps) {
  return (
    <div className={`flex items-center justify-between py-3 border-b border-gray-100 ${highlight ? 'font-bold' : ''}`}>
      <span className={`text-sm ${highlight ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm font-mono ${isNeg ? 'text-red-600 font-bold' : highlight ? 'text-primary-800 text-base' : 'text-gray-900'}`}>
        {value !== null && value !== undefined ? Number(value).toLocaleString() : '—'}
      </span>
    </div>
  )
}

interface SampleBillEntry extends BillEntry {
  house: House & {
    houseNo: string
    society?: Society & { name: string }
  }
  monthlyBill: MonthlyBill
}

const sampleBills: Record<string, SampleBillEntry> = {
  'bill-1': {
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
    aa: 50,
    b: null,
    dan: 30,
    wch: null,
    isNegative: false,
    isManualHv: false,
    house: {
      id: 'house-10',
      houseNo: '10',
      floor: 'First',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      societyId: 'soc-1',
      society: {
        id: 'soc-1',
        name: 'Pathik SCO',
        address: null,
        city: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        adminId: 'admin-1',
        admin: {} as any,
        houses: [],
        monthlyBills: [],
        calcConfigs: []
      },
      resident: null,
      billEntries: []
    },
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
  },
  'bill-2': {
    id: 'bill-2',
    createdAt: new Date('2026-06-15'),
    updatedAt: new Date('2026-06-20'),
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
    b: 25,
    dan: null,
    wch: 20,
    isNegative: false,
    isManualHv: false,
    house: {
      id: 'house-10',
      houseNo: '10',
      floor: 'First',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      societyId: 'soc-1',
      society: {
        id: 'soc-1',
        name: 'Pathik SCO',
        address: null,
        city: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        adminId: 'admin-1',
        admin: {} as any,
        houses: [],
        monthlyBills: [],
        calcConfigs: []
      },
      resident: null,
      billEntries: []
    },
    monthlyBill: {
      id: 'mb-2',
      year: 2026,
      month: 5,
      status: 'CORRECTED',
      notes: 'Corrected reading adjustment',
      createdAt: new Date('2026-06-01'),
      updatedAt: new Date('2026-06-20'),
      publishedAt: new Date('2026-06-15'),
      societyId: 'soc-1',
      society: {} as any,
      entries: []
    }
  },
  'bill-3': {
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
    house: {
      id: 'house-10',
      houseNo: '10',
      floor: 'First',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      societyId: 'soc-1',
      society: {
        id: 'soc-1',
        name: 'Pathik SCO',
        address: null,
        city: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        adminId: 'admin-1',
        admin: {} as any,
        houses: [],
        monthlyBills: [],
        calcConfigs: []
      },
      resident: null,
      billEntries: []
    },
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
}

export default function ResidentBillDetail() {
  const params = useParams<{ entryId: string }>()
  const entryId = params?.entryId

  const entry = entryId ? sampleBills[entryId] : undefined
  const loading = false
  const error = entry ? '' : 'Bill not found'

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>
  if (error) return (
    <div className="card text-center py-10">
      <p className="text-red-500 mb-4">{error}</p>
      <Link href="/resident" className="btn-secondary inline-flex"><ArrowLeft className="w-4 h-4" /> Back</Link>
    </div>
  )

  if (!entry) return null

  const m = entry.monthlyBill
  const isNeg = (entry.unit ?? 0) < 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/resident" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{MONTHS[m.month - 1]} {m.year}</h1>
          <p className="text-sm text-gray-500">House {entry.house.houseNo} · {entry.house.society?.name}</p>
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

        <Row label="House No." value={Number(entry.house.houseNo) || 0} />
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
