import type { Society, House, Resident, MonthlyBill, BillEntry, CalcConfig } from '@/types'

/**
 * PROXY UTILITIES — Typed URL builders + fetch wrappers for Next.js Route Handlers.
 *
 * These helpers:
 *   1. Build consistent URLs for every API endpoint
 *   2. Wrap native fetch with JSON encoding / decoding
 *   3. Surface non-2xx responses as typed Errors (status + message)
 *   4. Preserve cookies on the server (use `next/headers`) and on the client via credentials:'include'
 *
 * Client pages (e.g. `/admin/bills`) call `await api.bills.create(...)`;
 * server-side code can use the `buildXxxUrl` builders to call Route Handlers internally,
 * or (preferably) call the service functions (`calculateEntry`, etc.) directly.
 */

export const API_BASE = '/api'

// ─── URL Builders ─────────────────────────────────────────────────────────

export const urls = {
  auth: {
    login:  () => `${API_BASE}/auth/login`,
    logout: () => `${API_BASE}/auth/logout`,
    me:     () => `${API_BASE}/auth/me`,
  },
  societies: {
    list:   ()  => `${API_BASE}/societies`,
    create: ()  => `${API_BASE}/societies`,
    one:    (id: string) => `${API_BASE}/societies/${id}`,
    update: (id: string) => `${API_BASE}/societies/${id}`,
    remove: (id: string) => `${API_BASE}/societies/${id}`,
  },
  houses: {
    list:    (params?: { societyId?: string })  => `${API_BASE}/houses${params?.societyId ? `?societyId=${params.societyId}` : ''}`,
    create:  ()  => `${API_BASE}/houses`,
    one:     (id: string) => `${API_BASE}/houses/${id}`,
    update:  (id: string) => `${API_BASE}/houses/${id}`,
    remove:  (id: string) => `${API_BASE}/houses/${id}`,
  },
  residents: {
    list:    (params?: { societyId?: string })  => `${API_BASE}/residents${params?.societyId ? `?societyId=${params.societyId}` : ''}`,
    create:  ()  => `${API_BASE}/residents`,
    one:     (id: string) => `${API_BASE}/residents/${id}`,
    update:  (id: string) => `${API_BASE}/residents/${id}`,
    remove:  (id: string) => `${API_BASE}/residents/${id}`,
  },
  bills: {
    list:   (params?: { societyId?: string })  => `${API_BASE}/bills${params?.societyId ? `?societyId=${params.societyId}` : ''}`,
    create: ()  => `${API_BASE}/bills`,
    one:    (societyId: string, year: number, month: number) => `${API_BASE}/bills/${societyId}/${year}/${month}`,
    update: (societyId: string, year: number, month: number) => `${API_BASE}/bills/${societyId}/${year}/${month}`,
    publish:(societyId: string, year: number, month: number) => `${API_BASE}/bills/${societyId}/${year}/${month}/publish`,
  },
  billEntries: {
    update: (entryId: string) => `${API_BASE}/bills/entries/${entryId}`,
    setHv:  (entryId: string) => `${API_BASE}/bills/entries/${entryId}/hv`,
  },
  portal: {
    myBills:   () => `${API_BASE}/portal/bills`,
    billDetail: (entryId: string) => `${API_BASE}/portal/bills/${entryId}`,
  },
  config: {
    list:   (params?: { societyId?: string }) => `${API_BASE}/config${params?.societyId ? `?societyId=${params.societyId}` : ''}`,
    create: () => `${API_BASE}/config`,
    one:    (id: string) => `${API_BASE}/config/${id}`,
    update: (id: string) => `${API_BASE}/config/${id}`,
    remove: (id: string) => `${API_BASE}/config/${id}`,
  },
  export: {
    excel: (params?: { societyId?: string; year?: number; month?: number }) => {
      const qs = new URLSearchParams()
      if (params?.societyId) qs.set('societyId', params.societyId)
      if (params?.year)      qs.set('year', String(params.year))
      if (params?.month)     qs.set('month', String(params.month))
      const q = qs.toString()
      return `${API_BASE}/export/excel${q ? `?${q}` : ''}`
    },
    pdf: (entryId: string) => `${API_BASE}/export/pdf?entryId=${entryId}`,
  },
  health: () => `${API_BASE}/health`,
}

// ─── Fetch helpers ────────────────────────────────────────────────────────

export interface ApiError extends Error {
  status: number
  message: string
}

function makeError(status: number, msg: string): ApiError {
  const e = new Error(msg) as ApiError
  e.status = status
  e.message = msg
  return e
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) return undefined as T
  try { return JSON.parse(text) as T } catch { return text as unknown as T }
}

async function request<T>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers ?? {})
  if (init.body !== undefined && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
  })
  if (res.ok) return parse<T>(res)
  const parsed = await parse<any>(res).catch(() => ({}))
  const msg = parsed?.error || parsed?.message || res.statusText || `HTTP ${res.status}`
  throw makeError(res.status, msg)
}

export const fetchJson = {
  get:    <T>(url: string, init?: Omit<RequestInit, 'body' | 'method'>) =>
    request<T>(url, { ...init, method: 'GET' }),
  post:   <T>(url: string, body?: any, init?: Omit<RequestInit, 'body' | 'method'>) =>
    request<T>(url, { ...init, method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch:  <T>(url: string, body?: any, init?: Omit<RequestInit, 'body' | 'method'>) =>
    request<T>(url, { ...init, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put:    <T>(url: string, body?: any, init?: Omit<RequestInit, 'body' | 'method'>) =>
    request<T>(url, { ...init, method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string, init?: Omit<RequestInit, 'body' | 'method'>) =>
    request<T>(url, { ...init, method: 'DELETE' }),
}

// ─── Typed API client ──────────────────────────────────────────────────────

export const api = {
  auth: {
    login:    (payload: { email: string; password: string }) =>
      fetchJson.post<{ user: { id: string; email: string; role: 'ADMIN' | 'RESIDENT'; isActive: boolean } }>(urls.auth.login(), payload),
    logout:   () => fetchJson.post<{ success: boolean }>(urls.auth.logout()),
    me:       () => fetchJson.get<{ user: { id: string; email: string; role: 'ADMIN' | 'RESIDENT'; isActive: boolean } }>(urls.auth.me()),
  },
  societies: {
    list:   () => fetchJson.get<Society[]>(urls.societies.list()),
    create: (payload: Partial<Society>) => fetchJson.post<Society>(urls.societies.create(), payload),
    update: (id: string, payload: Partial<Society>) => fetchJson.patch<Society>(urls.societies.update(id), payload),
    remove: (id: string) => fetchJson.delete<void>(urls.societies.remove(id)),
  },
  houses: {
    list:   (params?: { societyId?: string }) => fetchJson.get<House[]>(urls.houses.list(params)),
    create: (payload: Partial<House>) => fetchJson.post<House>(urls.houses.create(), payload),
    update: (id: string, payload: Partial<House>) => fetchJson.patch<House>(urls.houses.update(id), payload),
    remove: (id: string) => fetchJson.delete<void>(urls.houses.remove(id)),
  },
  residents: {
    list:   (params?: { societyId?: string }) => fetchJson.get<Resident[]>(urls.residents.list(params)),
    create: (payload: Partial<Resident>) => fetchJson.post<Resident>(urls.residents.create(), payload),
    update: (id: string, payload: Partial<Resident>) => fetchJson.patch<Resident>(urls.residents.update(id), payload),
    remove: (id: string) => fetchJson.delete<void>(urls.residents.remove(id)),
  },
  bills: {
    list:   (params?: { societyId?: string }) => fetchJson.get<(MonthlyBill & { _count?: { entries: number } })[]>(urls.bills.list(params)),
    create: (payload: { societyId: string; year: number; month: number }) =>
      fetchJson.post<{ bill: MonthlyBill & { entries: (BillEntry & { house: House })[]; society: Society }; hasPrevBill: boolean; prevMonth: string; missingPrevHouses: string[] }>(urls.bills.create(), payload),
    one:    (societyId: string, year: number, month: number) =>
      fetchJson.get<MonthlyBill & { entries: (BillEntry & { house: House })[]; society: Society }>(urls.bills.one(societyId, year, month)),
    update: (societyId: string, year: number, month: number, payload: { notes?: string }) =>
      fetchJson.patch<MonthlyBill>(urls.bills.update(societyId, year, month), payload),
    publish: (societyId: string, year: number, month: number) =>
      fetchJson.post<MonthlyBill & { entries: (BillEntry & { house: House })[] }>(urls.bills.publish(societyId, year, month)),
  },
  billEntries: {
    update: (entryId: string, payload: { av: number; societyId: string }) =>
      fetchJson.patch<BillEntry & { house: House }>(urls.billEntries.update(entryId), payload),
    setHv:  (entryId: string, payload: { hv: number; societyId: string }) =>
      fetchJson.patch<BillEntry & { house: House }>(urls.billEntries.setHv(entryId), payload),
  },
  portal: {
    myBills:    () => fetchJson.get<(BillEntry & { monthlyBill: MonthlyBill })[]>(urls.portal.myBills()),
    billDetail: (entryId: string) => fetchJson.get<BillEntry & { monthlyBill: MonthlyBill; house: House }>(urls.portal.billDetail(entryId)),
  },
  config: {
    list:   (params?: { societyId?: string }) => fetchJson.get<CalcConfig[]>(urls.config.list(params)),
    create: (payload: Partial<CalcConfig>) => fetchJson.post<CalcConfig>(urls.config.create(), payload),
    update: (id: string, payload: Partial<CalcConfig>) => fetchJson.patch<CalcConfig>(urls.config.update(id), payload),
    remove: (id: string) => fetchJson.delete<void>(urls.config.remove(id)),
  },
  health: () => fetchJson.get<{ status: 'ok'; timestamp: string }>(urls.health()),
}
