'use client'

import React, { useEffect, useState, useCallback } from 'react'
import type { Society } from '@/types'
import toast from 'react-hot-toast'
import { Building2, Plus, Edit2, Check, X } from 'lucide-react'

interface SocietyForm {
  name: string
  address: string
  city: string
}

export default function SocietyManagement() {
  const [societies, setSocieties] = useState<(Society & { _count?: { houses: number } })[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<SocietyForm>({ name: '', address: '', city: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/societies')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSocieties(data.societies || [])
    } catch {
      toast.error('Failed to load societies')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/societies/${editing}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, address: form.address, city: form.city }),
        })
        if (!res.ok) throw new Error('Failed to update')
        const data = await res.json()
        setSocieties(prev => prev.map(s => s.id === editing ? { ...s, ...data.society, _count: s._count } : s))
        toast.success('Society updated')
        setEditing(null)
      } else {
        const res = await fetch('/api/societies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, address: form.address, city: form.city }),
        })
        if (!res.ok) throw new Error('Failed to create')
        const data = await res.json()
        setSocieties(prev => [...prev, data.society])
        toast.success('Society created')
        setShowForm(false)
      }
      setForm({ name: '', address: '', city: '' })
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (s: Society) => {
    setEditing(s.id)
    setForm({ name: s.name, address: s.address || '', city: s.city || '' })
    setShowForm(false)
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Societies</h1>
          <p className="text-gray-500 text-sm">Manage your housing societies</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', address: '', city: '' }) }} className="btn-primary">
          <Plus className="w-4 h-4" /> New Society
        </button>
      </div>

      {(showForm || editing) && (
        <div className="card border-primary-200 bg-primary-50">
          <h3 className="font-semibold text-primary-900 mb-4">{editing ? 'Edit Society' : 'New Society'}</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Society Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Address</label>
              <input
                className="input"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">City</label>
              <input
                className="input"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                <Check className="w-4 h-4" /> {editing ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null) }}
                className="btn-secondary"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {societies.length === 0 && (
          <div className="card text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No societies yet. Create one to get started.</p>
          </div>
        )}
        {societies.map(s => (
          <div key={s.id} className="card flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{s.name}</p>
              <p className="text-sm text-gray-500">{[s.address, s.city].filter(Boolean).join(', ')}</p>
              <p className="text-xs text-gray-400 mt-1">{s._count?.houses || 0} houses</p>
            </div>
            <button onClick={() => startEdit(s)} className="btn-secondary text-xs px-3 py-1.5">
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
