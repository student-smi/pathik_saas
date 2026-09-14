import React, { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Settings, Plus, Save, Trash2, Info } from 'lucide-react'

const FIELD_DOCS = {
  FALO_RATE: 'Rate per unit of water consumed. Formula: FIXED:5 means ₹5 per unit. FALO = UNIT × this rate.',
  V:         'Fixed monthly water charge per house. Formula: FIXED:600 means ₹600 per house per month.',
  AA:        'Custom field — formula not established from source bill. Configure as needed (e.g. FIXED:100, UNIT*2).',
  B:         'Custom field — formula not established from source bill.',
  DAN:       'Custom field — formula not established from source bill.',
  WCH:       'Water Connection Hire or other charge — formula not established. Configure as FIXED:value or expression.',
}

const PRESET_FIELDS = ['FALO_RATE', 'V', 'AA', 'B', 'DAN', 'WCH']

export default function CalcConfigScreen() {
  const [societies, setSocieties] = useState([])
  const [selectedSociety, setSelectedSociety] = useState('')
  const [configs, setConfigs] = useState([])
  const [editing, setEditing] = useState({})
  const [newField, setNewField] = useState({ fieldName: '', formula: '', description: '' })
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { api.get('/societies').then(r => { setSocieties(r.data); if (r.data[0]) setSelectedSociety(r.data[0].id) }) }, [])
  useEffect(() => {
    if (!selectedSociety) return
    api.get(`/config?societyId=${selectedSociety}`).then(r => {
      setConfigs(r.data)
      const ed = {}
      r.data.forEach(c => { ed[c.fieldName] = { formula: c.formula, description: c.description || '', isActive: c.isActive } })
      setEditing(ed)
    })
  }, [selectedSociety])

  const save = async (fieldName) => {
    const data = editing[fieldName]
    try {
      await api.put('/config', { societyId: selectedSociety, fieldName, ...data })
      toast.success(`${fieldName} saved`)
      api.get(`/config?societyId=${selectedSociety}`).then(r => setConfigs(r.data))
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  const deleteConfig = async (id) => {
    if (!confirm('Delete this config?')) return
    try {
      await api.delete(`/config/${id}`)
      toast.success('Config deleted')
      setConfigs(c => c.filter(x => x.id !== id))
    } catch (err) { toast.error('Error') }
  }

  const saveNew = async () => {
    if (!newField.fieldName || !newField.formula) return toast.error('Field name and formula required')
    try {
      await api.put('/config', { societyId: selectedSociety, ...newField })
      toast.success('Config added')
      setShowNew(false); setNewField({ fieldName: '', formula: '', description: '' })
      api.get(`/config?societyId=${selectedSociety}`).then(r => { setConfigs(r.data); const ed = {}; r.data.forEach(c => { ed[c.fieldName] = { formula: c.formula, description: c.description || '', isActive: c.isActive } }); setEditing(ed) })
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  const existing = configs.map(c => c.fieldName)
  const suggested = PRESET_FIELDS.filter(f => !existing.includes(f))

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calculation Config</h1>
        <p className="text-gray-500 text-sm">Configure formulas for each society. Changes apply to future recalculations.</p>
      </div>

      <div className="card bg-blue-50 border-blue-200 text-sm text-blue-800">
        <div className="flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Formula Syntax</p>
            <ul className="space-y-0.5 text-xs">
              <li><code className="bg-blue-100 px-1 rounded">FIXED:600</code> — always returns 600</li>
              <li><code className="bg-blue-100 px-1 rounded">PERCENT:10</code> — 10% of UNIT</li>
              <li><code className="bg-blue-100 px-1 rounded">UNIT * 3</code> — expression (variables: UNIT, FALO, V, HV, AV, TOTAL)</li>
            </ul>
            <p className="text-xs mt-2 text-blue-600">Note: AA, B, DAN, WCH formulas are not established from the original bill. Configure them here when ready.</p>
          </div>
        </div>
      </div>

      <div>
        <label className="label">Select Society</label>
        <select className="input max-w-xs" value={selectedSociety} onChange={e => setSelectedSociety(e.target.value)}>
          {societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Existing configs */}
      <div className="space-y-3">
        {configs.map(cfg => (
          <div key={cfg.id} className="card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-bold text-gray-900">{cfg.fieldName}</span>
                <span className={`ml-2 ${cfg.isActive ? 'badge-published' : 'badge-draft'}`}>{cfg.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <button onClick={() => deleteConfig(cfg.id)} className="text-red-400 hover:text-red-600 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">{FIELD_DOCS[cfg.fieldName] || 'Custom field'}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Formula</label>
                <input className="input font-mono text-sm" value={editing[cfg.fieldName]?.formula || ''} onChange={e => setEditing(ed => ({ ...ed, [cfg.fieldName]: { ...ed[cfg.fieldName], formula: e.target.value } }))} />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input text-sm" value={editing[cfg.fieldName]?.description || ''} onChange={e => setEditing(ed => ({ ...ed, [cfg.fieldName]: { ...ed[cfg.fieldName], description: e.target.value } }))} />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => save(cfg.fieldName)} className="btn-primary text-xs px-3 py-1.5"><Save className="w-3 h-3" /> Save</button>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={editing[cfg.fieldName]?.isActive ?? true} onChange={e => setEditing(ed => ({ ...ed, [cfg.fieldName]: { ...ed[cfg.fieldName], isActive: e.target.checked } }))} />
                Active
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Suggested fields */}
      {suggested.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Suggested fields to configure:</p>
          <div className="flex flex-wrap gap-2">
            {suggested.map(f => (
              <button key={f} onClick={() => { setShowNew(true); setNewField(n => ({ ...n, fieldName: f })) }} className="btn-secondary text-xs px-3 py-1.5">+ {f}</button>
            ))}
          </div>
        </div>
      )}

      {/* Add new */}
      <button onClick={() => setShowNew(true)} className="btn-secondary w-full justify-center"><Plus className="w-4 h-4" /> Add Custom Config</button>

      {showNew && (
        <div className="card border-primary-200 bg-primary-50">
          <h3 className="font-semibold mb-3">New Config</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="label">Field Name</label>
              <input className="input" value={newField.fieldName} onChange={e => setNewField(f => ({ ...f, fieldName: e.target.value.toUpperCase() }))} placeholder="e.g. WCH" />
            </div>
            <div>
              <label className="label">Formula</label>
              <input className="input font-mono" value={newField.formula} onChange={e => setNewField(f => ({ ...f, formula: e.target.value }))} placeholder="FIXED:100" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <input className="input" value={newField.description} onChange={e => setNewField(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveNew} className="btn-primary"><Save className="w-4 h-4" /> Save</button>
            <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
