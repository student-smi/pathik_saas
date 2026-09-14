import React, { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Building2, Plus, Edit2, Check, X } from 'lucide-react'

export default function SocietyManagement() {
  const [societies, setSocieties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', address: '', city: '' })

  const load = () => api.get('/societies').then(r => setSocieties(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/societies/${editing}`, form)
        toast.success('Society updated')
        setEditing(null)
      } else {
        await api.post('/societies', form)
        toast.success('Society created')
        setShowForm(false)
      }
      setForm({ name: '', address: '', city: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    }
  }

  const startEdit = (s) => { setEditing(s.id); setForm({ name: s.name, address: s.address || '', city: s.city || '' }); setShowForm(false) }

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
            <div><label className="label">Society Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><label className="label">City</label><input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary"><Check className="w-4 h-4" /> {editing ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="btn-secondary"><X className="w-4 h-4" /> Cancel</button>
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
