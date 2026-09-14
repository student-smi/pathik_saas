import React, { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Home, Plus, Check, X, Trash2 } from 'lucide-react'

export default function HouseManagement() {
  const [societies, setSocieties] = useState([])
  const [selectedSociety, setSelectedSociety] = useState('')
  const [houses, setHouses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ houseNo: '', floor: '' })

  useEffect(() => { api.get('/societies').then(r => { setSocieties(r.data); if (r.data[0]) setSelectedSociety(r.data[0].id) }) }, [])
  useEffect(() => { if (selectedSociety) api.get(`/houses?societyId=${selectedSociety}`).then(r => setHouses(r.data)) }, [selectedSociety])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/houses', { societyId: selectedSociety, ...form })
      toast.success(`House ${form.houseNo} added`)
      setForm({ houseNo: '', floor: '' }); setShowForm(false)
      api.get(`/houses?societyId=${selectedSociety}`).then(r => setHouses(r.data))
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this house?')) return
    try {
      await api.delete(`/houses/${id}`)
      toast.success('House deleted')
      setHouses(h => h.filter(x => x.id !== id))
    } catch (err) { toast.error(err.response?.data?.error || 'Cannot delete') }
  }

  return (
    <div className="space-y-6 max-w-2xl">
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
                <td className="px-4 py-3 text-gray-500">{h.resident?.name || <span className="text-amber-600 text-xs">No resident</span>}</td>
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
    </div>
  )
}
