import React, { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Users, Plus, Check, X, KeyRound, Trash2, Sparkles, Copy, Eye, EyeOff } from 'lucide-react'

/**
 * Client-side preview of auto-generated email.
 * Mirrors the backend logic so admin sees it before submitting.
 */
function previewEmail(name) {
  if (!name.trim()) return ''
  const firstName = name.trim().split(/\s+/)[0]
  const clean = firstName.toLowerCase().replace(/[^a-z0-9]/g, '')
  return clean ? `${clean}@gmail.com` : ''
}

function previewPassword(houses, houseId) {
  const h = houses.find(h => h.id === houseId)
  return h ? h.houseNo : ''
}

// Small component to show generated credentials after creation
function CredentialsPopup({ creds, onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-green-600" />
          </div>
          <h3 className="font-bold text-gray-900">Resident Created!</h3>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Login credentials have been auto-generated. Share these with the resident.
        </p>

        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email (Login ID)</p>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-bold text-primary-700">{creds.email}</p>
              <button onClick={() => copy(creds.email)} className="text-gray-400 hover:text-primary-600 p-1 rounded">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Password</p>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-bold text-primary-700">{creds.password}</p>
              <button onClick={() => copy(creds.password)} className="text-gray-400 hover:text-primary-600 p-1 rounded">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {copied && <p className="text-xs text-green-600 text-center mt-2">Copied!</p>}

        <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
          ⚠ Password is the <strong>house number</strong>. Resident should change it after first login.
        </div>

        <button onClick={onClose} className="btn-primary w-full justify-center mt-4">
          Done
        </button>
      </div>
    </div>
  )
}

export default function ResidentManagement() {
  const [societies, setSocieties] = useState([])
  const [selectedSociety, setSelectedSociety] = useState('')
  const [houses, setHouses] = useState([])
  const [allHouses, setAllHouses] = useState([])
  const [residents, setResidents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [createdCreds, setCreatedCreds] = useState(null)

  // Form state — email & password are optional (auto-filled preview shown)
  const [form, setForm] = useState({ name: '', phone: '', houseId: '' })

  useEffect(() => {
    api.get('/societies').then(r => {
      setSocieties(r.data)
      if (r.data[0]) setSelectedSociety(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedSociety) return
    reload()
  }, [selectedSociety])

  const reload = () => {
    api.get(`/residents?societyId=${selectedSociety}`).then(r => setResidents(r.data))
    api.get(`/houses?societyId=${selectedSociety}`).then(r => {
      setAllHouses(r.data)
      setHouses(r.data.filter(h => !h.resident))
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      // Send only name, phone, houseId — email & password auto-generated on backend
      const res = await api.post('/residents', {
        name: form.name,
        phone: form.phone,
        houseId: form.houseId
      })
      // Show the generated credentials in a popup
      setCreatedCreds(res.data.generatedCredentials)
      setShowForm(false)
      setForm({ name: '', phone: '', houseId: '' })
      reload()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating resident')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this resident and their login account?')) return
    try {
      await api.delete(`/residents/${id}`)
      toast.success('Resident removed')
      reload()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.trim() === '') {
      return toast.error('Enter a new password')
    }
    try {
      await api.post(`/residents/${resetTarget}/reset-password`, { newPassword })
      toast.success('Password reset successfully')
      setResetTarget(null)
      setNewPassword('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    }
  }

  // Live preview of what will be auto-generated
  const emailPreview = previewEmail(form.name)
  const passwordPreview = previewPassword(houses, form.houseId)

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Credentials popup after creation */}
      {createdCreds && (
        <CredentialsPopup
          creds={createdCreds}
          onClose={() => setCreatedCreds(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Residents</h1>
          <p className="text-gray-500 text-sm">Email & password auto-generated from name and house number</p>
        </div>
        {selectedSociety && (
          <button onClick={() => { setShowForm(true); setForm({ name: '', phone: '', houseId: '' }) }} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Resident
          </button>
        )}
      </div>

      {/* Society selector */}
      <div>
        <label className="label">Select Society</label>
        <select className="input max-w-xs" value={selectedSociety} onChange={e => setSelectedSociety(e.target.value)}>
          {societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Add Resident Form */}
      {showForm && (
        <div className="card border-primary-200 bg-primary-50">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-primary-900">Add Resident</h3>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div>
                <label className="label">Owner Full Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Smit Panchal"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="label">Phone (optional)</label>
                <input
                  className="input"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>

              {/* House */}
              <div className="sm:col-span-2">
                <label className="label">House *</label>
                <select
                  className="input"
                  value={form.houseId}
                  onChange={e => setForm(f => ({ ...f, houseId: e.target.value }))}
                  required
                >
                  <option value="">Select house...</option>
                  {houses.map(h => (
                    <option key={h.id} value={h.id}>
                      House {h.houseNo} {h.floor ? `(${h.floor})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live preview of auto-generated credentials */}
            {(emailPreview || passwordPreview) && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-generated login credentials (preview)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-green-600 mb-0.5">Email (Login ID)</p>
                    <p className="font-mono text-sm font-bold text-green-800">
                      {emailPreview || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600 mb-0.5">Password</p>
                    <p className="font-mono text-sm font-bold text-green-800">
                      {passwordPreview || '— (select house)'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Resident will login with these credentials to view their bill.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primary">
                <Check className="w-4 h-4" /> Create Resident
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Password panel */}
      {resetTarget && (
        <div className="card border-amber-200 bg-amber-50">
          <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Reset Password
          </h3>
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <label className="label">New Password</label>
              <input
                type={showNewPwd ? 'text' : 'password'}
                className="input pr-9"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <button type="button" onClick={() => setShowNewPwd(v => !v)} className="absolute right-2 top-8 text-gray-400">
                {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={handleResetPassword} className="btn-primary">Set Password</button>
            <button onClick={() => { setResetTarget(null); setNewPassword('') }} className="btn-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Residents Table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">House</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Login Email</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {residents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No residents yet. Click "Add Resident" to create one.
                </td>
              </tr>
            )}
            {residents.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-primary-700">House {r.house.houseNo}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.user?.email}</td>
                <td className="px-4 py-3">
                  <span className={r.user?.isActive ? 'badge-published' : 'badge-draft'}>
                    {r.user?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => { setResetTarget(r.id); setShowForm(false) }}
                      className="p-1.5 rounded hover:bg-amber-50 text-amber-500 hover:text-amber-700"
                      title="Reset password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                      title="Delete resident"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* How it works info */}
      <div className="card bg-blue-50 border-blue-200 text-xs text-blue-700 p-4">
        <p className="font-semibold mb-1">🔐 Login credentials are auto-generated:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>Email</strong> = firstname@gmail.com (e.g. Smit Panchal → smit@gmail.com)</li>
          <li><strong>Password</strong> = House number (e.g. House 10 → password is "10")</li>
          <li>Resident opens the app, enters email + password, and sees their water bill</li>
          <li>Admin can reset password anytime using the 🔑 button</li>
        </ul>
      </div>
    </div>
  )
}
