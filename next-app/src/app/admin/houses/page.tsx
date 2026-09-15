'use client'

import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Home, Plus, Check, X, Trash2 } from 'lucide-react'
import type { Society, House, Resident } from '@/types'

interface SampleHouse extends House {
  resident: (Resident & { name: string }) | null
}

const sampleSocieties: Society[] = [
  {
    id: 'soc-1',
    name: 'Pathik SCO',
    address: 'Near Bus Stand, Sector 12',
    city: 'Ahmedabad',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    adminId: 'admin-1',
    admin: {} as any,
    houses: [],
    monthlyBills: [],
    calcConfigs: []
  },
  {
    id: 'soc-2',
    name: 'Shanti Nagar',
    address: 'Ring Road, Satellite',
    city: 'Ahmedabad',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    adminId: 'admin-1',
    admin: {} as any,
    houses: [],
    monthlyBills: [],
    calcConfigs: []
  }
]

const sampleHousesBySociety: Record<string, SampleHouse[]> = {
  'soc-1': [
    {
      id: 'house-1',
      houseNo: '1',
      floor: 'Ground',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      societyId: 'soc-1',
      society: {} as any,
      resident: {
        id: 'res-1',
        name: 'Rajesh Patel',
        phone: '9876543210',
        createdAt: new Date(),
        updatedAt: new Date(),
        houseId: 'house-1',
        house: {} as any,
        userId: 'user-1',
        user: {} as any
      },
      billEntries: []
    },
    {
      id: 'house-2',
      houseNo: '2',
      floor: 'Ground',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      societyId: 'soc-1',
      society: {} as any,
      resident: {
        id: 'res-2',
        name: 'Amit Shah',
        phone: '9876543211',
        createdAt: new Date(),
        updatedAt: new Date(),
        houseId: 'house-2',
        house: {} as any,
        userId: 'user-2',
        user: {} as any
      },
      billEntries: []
    },
    {
      id: 'house-10',
      houseNo: '10',
      floor: 'First',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      societyId: 'soc-1',
      society: {} as any,
      resident: {
        id: 'res-10',
        name: 'Resident 10',
        phone: '9876543220',
        createdAt: new Date(),
        updatedAt: new Date(),
        houseId: 'house-10',
        house: {} as any,
        userId: 'user-10',
        user: {} as any
      },
      billEntries: []
    },
    {
      id: 'house-11',
      houseNo: '11',
      floor: 'First',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      societyId: 'soc-1',
      society: {} as any,
      resident: null,
      billEntries: []
    },
    {
      id: 'house-12',
      houseNo: '12',
      floor: 'Second',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      societyId: 'soc-1',
      society: {} as any,
      resident: null,
      billEntries: []
    }
  ],
  'soc-2': [
    {
      id: 'house-s2-1',
      houseNo: 'A-101',
      floor: 'Ground',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      societyId: 'soc-2',
      society: {} as any,
      resident: {
        id: 'res-s2-1',
        name: 'Suresh Kumar',
        phone: '9876543300',
        createdAt: new Date(),
        updatedAt: new Date(),
        houseId: 'house-s2-1',
        house: {} as any,
        userId: 'user-s2-1',
        user: {} as any
      },
      billEntries: []
    },
    {
      id: 'house-s2-2',
      houseNo: 'A-102',
      floor: 'Ground',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      societyId: 'soc-2',
      society: {} as any,
      resident: null,
      billEntries: []
    }
  ]
}

export default function HouseManagement() {
  const [societies, setSocieties] = useState<Society[]>([])
  const [selectedSociety, setSelectedSociety] = useState<string>('')
  const [houses, setHouses] = useState<SampleHouse[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ houseNo: '', floor: '' })
  const [loadingSocieties, setLoadingSocieties] = useState(true)
  const [loadingHouses, setLoadingHouses] = useState(false)

  const loadSocieties = useCallback(async () => {
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
  }, [])

  const loadHouses = useCallback(async (socId: string) => {
    if (!socId) { setHouses([]); return }
    setLoadingHouses(true)
    try {
      const res = await fetch(`/api/houses?societyId=${encodeURIComponent(socId)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setHouses(data.houses || [])
    } catch {
      toast.error('Failed to load houses')
    } finally {
      setLoadingHouses(false)
    }
  }, [])

  useEffect(() => { loadSocieties() }, [loadSocieties])
  useEffect(() => { if (selectedSociety) loadHouses(selectedSociety) }, [selectedSociety, loadHouses])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ societyId: selectedSociety, houseNo: form.houseNo, floor: form.floor }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add')
      }
      toast.success(`House ${form.houseNo} added`)
      setForm({ houseNo: '', floor: '' }); setShowForm(false)
      loadHouses(selectedSociety)
    } catch (err: any) {
      toast.error(err.message || 'Error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this house?')) return
    try {
      const res = await fetch(`/api/houses/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Cannot delete')
      }
      toast.success('House deleted')
      loadHouses(selectedSociety)
    } catch (err: any) {
      toast.error(err.message || 'Cannot delete')
    }
  }

  if (loadingSocieties) return <div className="flex items-center justify-center h-48"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Houses</h1>
          <p className="text-gray-500 text-sm">Manage houses per society</p>
        </div>
        {selectedSociety && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add House</button>}
      </div>

      <div>
        <label className="label">Select Society</label>
        <select className="input max-w-xs" value={selectedSociety} onChange={e => setSelectedSociety(e.target.value)}>
          {societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="card border-primary-200 bg-primary-50">
          <h3 className="font-semibold text-primary-900 mb-4">Add New House</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div><label className="label">House No. *</label><input className="input" value={form.houseNo} onChange={e => setForm(f => ({ ...f, houseNo: e.target.value }))} placeholder="e.g. 10, A-101" required /></div>
            <div><label className="label">Floor</label><input className="input" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} placeholder="Ground, First..." /></div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary"><Check className="w-4 h-4" /> Add</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary"><X className="w-4 h-4" /> Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loadingHouses && <div className="text-center py-8 text-gray-400">Loading houses...</div>}

      {!loadingHouses && (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">House No.</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Floor</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Resident</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {houses.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No houses found</td></tr>
              )}
              {houses.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{h.houseNo}</td>
                  <td className="px-4 py-3 text-gray-500">{h.floor || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {h.resident?.name || <span className="text-amber-600 text-xs">No resident</span>}
                    {h.resident?.user?.email && (
                      <div className="text-xs text-gray-400 font-mono">{h.resident.user.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!h.resident && (
                      <button onClick={() => handleDelete(h.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
