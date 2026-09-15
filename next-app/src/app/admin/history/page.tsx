'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Society, MonthlyBill, BillStatus } from '@/types'
import toast from 'react-hot-toast'
import { History, FileText, Download, Eye } from 'lucide-react'

const sampleSocieties: Society[] = [
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

const sampleBillsBySociety: Record<string, (MonthlyBill & { _count?: { entries: number } })[]> = {
  '1': [
    {
      id: 'bill-1-2026-8',
      year: 2026,
      month: 8,
      status: 'PUBLISHED',
      notes: null,
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-15'),
      publishedAt: new Date('2026-08-15'),
      societyId: '1',
      society: {} as any,
      entries: [] as any,
      _count: { entries: 8 },
    },
    {
      id: 'bill-1-2026-6',
      year: 2026,
      month: 6,
      status: 'CORRECTED',
      notes: null,
      createdAt: new Date('2026-06-01'),
      updatedAt: new Date('2026-06-20'),
      publishedAt: new Date('2026-06-15'),
      societyId: '1',
      society: {} as any,
      entries: [] as any,
      _count: { entries: 8 },
    },
    {
      id: 'bill-1-2026-4',
      year: 2026,
      month: 4,
      status: 'PUBLISHED',
      notes: null,
      createdAt: new Date('2026-04-01'),
      updatedAt: new Date('2026-04-15'),
      publishedAt: new Date('2026-04-15'),
      societyId: '1',
      society: {} as any,
      entries: [] as any,
      _count: { entries: 8 },
    },
    {
      id: 'bill-1-2026-2',
      year: 2026,
      month: 2,
      status: 'PUBLISHED',
      notes: null,
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-15'),
      publishedAt: new Date('2026-02-15'),
      societyId: '1',
      society: {} as any,
      entries: [] as any,
      _count: { entries: 8 },
    },
  ],
  '2': [
    {
      id: 'bill-2-2026-8',
      year: 2026,
      month: 8,
      status: 'PUBLISHED',
      notes: null,
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-15'),
      publishedAt: new Date('2026-08-15'),
      societyId: '2',
      society: {} as any,
      entries: [] as any,
      _count: { entries: 6 },
    },
    {
      id: 'bill-2-2026-6',
      year: 2026,
      month: 6,
      status: 'PUBLISHED',
      notes: null,
      createdAt: new Date('2026-06-01'),
      updatedAt: new Date('2026-06-15'),
      publishedAt: new Date('2026-06-15'),
      societyId: '2',
      society: {} as any,
      entries: [] as any,
      _count: { entries: 6 },
    },
  ],
}

function getPeriodName(m: number): string {
  const map: Record<number, string> = {
    1: 'Jan - Feb', 2: 'Jan - Feb',
    3: 'Mar - Apr', 4: 'Mar - Apr',
    5: 'May - Jun', 6: 'May - Jun',
    7: 'Jul - Aug', 8: 'Jul - Aug',
    9: 'Sep - Oct', 10: 'Sep - Oct',
    11: 'Nov - Dec', 12: 'Nov - Dec',
  }
  return map[m] || `Period ${m}`
}

function StatusBadge({ status }: { status: BillStatus }) {
  const map: Record<BillStatus, string> = { DRAFT: 'badge-draft', PUBLISHED: 'badge-published', CORRECTED: 'badge-corrected' }
  return <span className={map[status] || 'badge-draft'}>{status}</span>
}

export default function BillHistory() {
  const [societies, setSocieties] = useState<Society[]>([])
  const [selectedSociety, setSelectedSociety] = useState<string>('')
  const [bills, setBills] = useState<(MonthlyBill & { _count?: { entries: number } })[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSocieties, setLoadingSocieties] = useState(true)

  const loadSocieties = async () => {
    try {
      const res = await fetch('/api/societies')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSocieties(data.societies || [])
      if (data.societies?.[0]) setSelectedSociety(data.societies[0].id)
    } catch {
      toast.error('Failed to load societies')
    } finally {
      setLoadingSocieties(false)
    }
  }

  const loadBills = async (socId: string) => {
    if (!socId) { setBills([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/bills?societyId=${encodeURIComponent(socId)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setBills(data.bills || [])
    } catch {
      toast.error('Failed to load bills')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSocieties() }, [])
  useEffect(() => { if (selectedSociety) loadBills(selectedSociety) }, [selectedSociety])

  const handleExport = (b: any) => {
    const params = new URLSearchParams({ societyId: selectedSociety, year: String(b.year), month: String(b.month) })
    window.location.href = `/api/export/excel?${params.toString()}`
  }

  if (loadingSocieties) return <div className="flex items-center justify-center h-48"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>

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
              <Link href={`/admin/bills?societyId=${selectedSociety}&year=${b.year}&month=${b.month}`} className="btn-secondary text-xs px-2 py-1.5">
                <Eye className="w-3.5 h-3.5" /> View
              </Link>
              <button onClick={() => handleExport(b)} className="btn-secondary text-xs px-2 py-1.5" title="Export Excel">
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
