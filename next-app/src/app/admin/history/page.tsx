'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Society, MonthlyBill, BillStatus } from '@/types'
import toast from 'react-hot-toast'
import { History, FileText, Download, Eye, Edit, Trash2 } from 'lucide-react'

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

  const handleExportExcel = (b: any) => {
    const params = new URLSearchParams({
      billId: b.id,
      societyId: selectedSociety,
      year: String(b.year),
      month: String(b.month),
    })
    toast.success('Downloading Excel...')
    window.location.assign(`/api/export/excel?${params.toString()}`)
  }

  const handleExportPdf = (b: any) => {
    const params = new URLSearchParams({
      billId: b.id,
      societyId: selectedSociety,
      year: String(b.year),
      month: String(b.month),
    })
    toast.success('Opening PDF...')
    window.open(`/api/export/pdf?${params.toString()}`, '_blank')
  }

  const handleDeleteBill = async (b: any) => {
    const period = getPeriodName(b.month)
    if (!confirm(`Are you sure you want to delete ${period} ${b.year} bill?\n\nThis will remove all entries for this period.`)) return
    try {
      toast.loading('Deleting bill...', { id: 'delete-toast' })
      const res = await fetch(`/api/bills?billId=${encodeURIComponent(b.id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }))
        throw new Error(err.error || 'Delete failed')
      }
      toast.success('Bill deleted successfully!', { id: 'delete-toast' })
      setBills(prev => prev.filter(item => item.id !== b.id))
    } catch (err: any) {
      toast.error(err.message || 'Delete failed', { id: 'delete-toast' })
    }
  }

  if (loadingSocieties) return <div className="flex items-center justify-center h-48"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bill History</h1>
        <p className="text-gray-500 text-xs sm:text-sm">All historical bills — edit, delete, or export any bill period</p>
      </div>

      <div className="card p-4">
        <label className="label">Select Society</label>
        <select className="input w-full sm:max-w-xs" value={selectedSociety} onChange={e => setSelectedSociety(e.target.value)}>
          {societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <div className="animate-spin h-6 w-6 border-3 border-primary-600 border-t-transparent rounded-full mr-2" />
          <span>Loading history...</span>
        </div>
      )}

      {!loading && bills.length === 0 && (
        <div className="card text-center py-12">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No bills yet for this society.</p>
        </div>
      )}

      <div className="space-y-3">
        {bills.map(b => (
          <div key={b.id} className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gray-300 transition-colors">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900 text-base">{getPeriodName(b.month)} {b.year}</p>
                  <StatusBadge status={b.status} />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{b._count?.entries || 0} houses</span>
                  {b.publishedAt && (
                    <span>• Published {new Date(b.publishedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
              <Link
                href={`/admin/bills?societyId=${selectedSociety}&year=${b.year}&month=${b.month}`}
                className="btn-secondary text-xs px-3 py-2 flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                <Edit className="w-3.5 h-3.5 text-primary-600" /> Edit / View
              </Link>
              <button
                onClick={() => handleExportExcel(b)}
                className="btn-secondary text-xs px-3 py-2 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                title="Export Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Excel
              </button>
              <button
                onClick={() => handleExportPdf(b)}
                className="btn-secondary text-xs px-3 py-2 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                title="Export PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" /> PDF
              </button>
              <button
                onClick={() => handleDeleteBill(b)}
                className="btn-danger text-xs px-3 py-2 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                title="Delete Bill"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
