import type { Society, House, Resident, MonthlyBill, BillEntry, CalcConfig, BillStatus } from '@/types'
import type { BillStore } from './bill-service'
import { previousMonth } from './bill-service'
import { createAdminClient } from './supabase/server'

type SupabaseClient = ReturnType<typeof createAdminClient>

export function createSupabaseBillStore(supabase: SupabaseClient): BillStore {
  return {
    async findBillUnique(societyId: string, year: number, month: number): Promise<MonthlyBill | null> {
      const { data: rawBills } = await supabase.from('monthly_bills').select('*')
      if (!rawBills) return null
      const data = rawBills.find(b => (b.societyId || b.society_id) === societyId && b.year === year && b.month === month)
      if (!data) return null
      return {
        id: data.id,
        year: data.year,
        month: data.month,
        status: (data.status || 'DRAFT') as BillStatus,
        notes: data.notes ?? null,
        createdAt: data.createdAt ? new Date(data.createdAt) : (data.created_at ? new Date(data.created_at) : new Date()),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : (data.updated_at ? new Date(data.updated_at) : new Date()),
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : (data.published_at ? new Date(data.published_at) : null),
        societyId: data.societyId || data.society_id,
        society: {} as any,
        entries: [] as any,
      }
    },

    async findBillById(id: string): Promise<(MonthlyBill & { entries?: BillEntry[] }) | null> {
      const { data } = await supabase.from('monthly_bills').select('*').eq('id', id).maybeSingle()
      if (!data) return null
      const { data: rawEntries } = await supabase.from('bill_entries').select('*')
      const filtered = (rawEntries || []).filter(e => (e.monthlyBillId || e.monthly_bill_id) === id)
      return {
        id: data.id,
        year: data.year,
        month: data.month,
        status: (data.status || 'DRAFT') as BillStatus,
        notes: data.notes ?? null,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        societyId: data.societyId || data.society_id,
        society: {} as any,
        entries: filtered.map(e => ({
          id: e.id,
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
          updatedAt: e.updatedAt ? new Date(e.updatedAt) : new Date(),
          monthlyBillId: e.monthlyBillId || e.monthly_bill_id,
          monthlyBill: {} as any,
          houseId: e.houseId || e.house_id,
          house: {} as any,
          hv: e.hv ?? 0,
          av: e.av ?? null,
          hvAutoFilled: e.hvAutoFilled !== undefined ? !!e.hvAutoFilled : !!e.hv_auto_filled,
          unit: e.unit ?? null,
          falo: e.falo ?? null,
          v: e.v ?? 0,
          total: e.total ?? null,
          aa: e.aa ?? null,
          b: e.b ?? null,
          dan: e.dan ?? null,
          wch: e.wch ?? null,
          isNegative: e.isNegative !== undefined ? !!e.isNegative : !!e.is_negative,
          isManualHv: e.isManualHv !== undefined ? !!e.isManualHv : !!e.is_manual_hv,
        })),
      }
    },

    async listHouses(societyId: string): Promise<House[]> {
      const { data: rawHouses } = await supabase.from('houses').select('*')
      if (!rawHouses) return []
      const filtered = rawHouses.filter(h => (h.societyId || h.society_id) === societyId && (h.isActive ?? h.is_active ?? true))
      filtered.sort((a, b) => {
        const numA = parseInt(a.houseNo || a.house_no || '0', 10)
        const numB = parseInt(b.houseNo || b.house_no || '0', 10)
        return (isNaN(numA) || isNaN(numB)) ? (a.houseNo || a.house_no || '').localeCompare(b.houseNo || b.house_no || '') : numA - numB
      })
      return filtered.map(h => ({
        id: h.id,
        houseNo: h.houseNo || h.house_no,
        floor: h.floor ?? null,
        isActive: h.isActive !== undefined ? !!h.isActive : !!h.is_active,
        createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
        updatedAt: h.updatedAt ? new Date(h.updatedAt) : new Date(),
        societyId: h.societyId || h.society_id,
        society: {} as any,
        resident: null,
        billEntries: [] as any,
      }))
    },

    async findPreviousBill(societyId: string, year: number, month: number): Promise<(MonthlyBill & { entries: BillEntry[] }) | null> {
      const prev = previousMonth(year, month)
      const { data: rawBills } = await supabase.from('monthly_bills').select('*')
      if (!rawBills) return null
      const data = rawBills.find(b => (b.societyId || b.society_id) === societyId && b.year === prev.year && b.month === prev.month)
      if (!data) return null
      const { data: rawEntries } = await supabase.from('bill_entries').select('*')
      const filtered = (rawEntries || []).filter(e => (e.monthlyBillId || e.monthly_bill_id) === data.id)
      return {
        id: data.id,
        year: data.year,
        month: data.month,
        status: (data.status || 'DRAFT') as BillStatus,
        notes: data.notes ?? null,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        societyId: data.societyId || data.society_id,
        society: {} as any,
        entries: filtered.map(e => ({
          id: e.id,
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
          updatedAt: e.updatedAt ? new Date(e.updatedAt) : new Date(),
          monthlyBillId: e.monthlyBillId || e.monthly_bill_id,
          monthlyBill: {} as any,
          houseId: e.houseId || e.house_id,
          house: {} as any,
          hv: e.hv ?? 0,
          av: e.av ?? null,
          hvAutoFilled: e.hvAutoFilled !== undefined ? !!e.hvAutoFilled : !!e.hv_auto_filled,
          unit: e.unit ?? null,
          falo: e.falo ?? null,
          v: e.v ?? 0,
          total: e.total ?? null,
          aa: e.aa ?? null,
          b: e.b ?? null,
          dan: e.dan ?? null,
          wch: e.wch ?? null,
          isNegative: e.isNegative !== undefined ? !!e.isNegative : !!e.is_negative,
          isManualHv: e.isManualHv !== undefined ? !!e.isManualHv : !!e.is_manual_hv,
        })),
      }
    },

    async listConfigs(societyId: string): Promise<CalcConfig[]> {
      const { data: rawConfigs } = await supabase.from('calc_configs').select('*')
      if (!rawConfigs) return []
      const filtered = rawConfigs.filter(c => (c.societyId || c.society_id) === societyId && (c.isActive ?? c.is_active ?? true))
      return filtered.map(c => ({
        id: c.id,
        societyId: c.societyId || c.society_id,
        society: {} as any,
        fieldName: c.fieldName || c.field_name,
        formula: c.formula || '',
        description: c.description ?? null,
        isActive: c.isActive !== undefined ? !!c.isActive : !!c.is_active,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      }))
    },

    async createBill(data: { societyId: string; year: number; month: number; status: BillStatus }): Promise<MonthlyBill> {
      const { data: row, error } = await supabase
        .from('monthly_bills')
        .insert({
          societyId: data.societyId,
          year: data.year,
          month: data.month,
          status: data.status,
        })
        .select()
        .single()
      if (error || !row) {
        throw new Error(error?.message || 'Failed to create bill')
      }
      return {
        id: row.id,
        year: row.year,
        month: row.month,
        status: (row.status || 'DRAFT') as BillStatus,
        notes: row.notes ?? null,
        createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
        publishedAt: row.publishedAt ? new Date(row.publishedAt) : null,
        societyId: row.societyId || row.society_id,
        society: {} as any,
        entries: [] as any,
      }
    },

    async createEntries(entries: Omit<BillEntry, 'id' | 'createdAt' | 'updatedAt' | 'house'>[]): Promise<void> {
      if (entries.length === 0) return
      const rows = entries.map(e => ({
        monthlyBillId: e.monthlyBillId,
        houseId: e.houseId,
        hv: e.hv,
        av: e.av,
        hvAutoFilled: e.hvAutoFilled,
        isManualHv: e.isManualHv,
        unit: e.unit,
        falo: e.falo,
        v: e.v,
        total: e.total,
        aa: e.aa,
        b: e.b,
        dan: e.dan,
        wch: e.wch,
        isNegative: e.isNegative,
      }))
      const { error } = await supabase.from('bill_entries').insert(rows)
      if (error) throw new Error(error.message)
    },

    async getFullBill(id: string): Promise<(MonthlyBill & { entries: Array<BillEntry & { house: House }>; society: Society }) | null> {
      const { data: billRow } = await supabase.from('monthly_bills').select('*').eq('id', id).maybeSingle()
      if (!billRow) return null

      const { data: socRow } = await supabase.from('societies').select('*').eq('id', billRow.societyId || billRow.society_id).maybeSingle()
      const { data: rawEntries } = await supabase.from('bill_entries').select('*')
      const { data: rawHouses } = await supabase.from('houses').select('*')

      const houseMap: Record<string, any> = {}
      if (rawHouses) {
        for (const h of rawHouses) houseMap[h.id] = h
      }

      const filteredEntries = (rawEntries || []).filter(e => (e.monthlyBillId || e.monthly_bill_id) === id)

      const society: Society = {
        id: socRow?.id || '',
        name: socRow?.name || 'Pathik Society',
        address: socRow?.address ?? null,
        city: socRow?.city ?? null,
        isActive: !!socRow?.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
        adminId: socRow?.adminId || '',
        admin: {} as any,
        houses: [] as any,
        monthlyBills: [] as any,
        calcConfigs: [] as any,
      }

      const entries: Array<BillEntry & { house: House }> = filteredEntries.map(e => {
        const hId = e.houseId || e.house_id
        const hRow = houseMap[hId] || {}
        const house: House = {
          id: hRow.id || hId,
          houseNo: hRow.houseNo || hRow.house_no || '',
          floor: hRow.floor ?? null,
          isActive: hRow.isActive !== undefined ? !!hRow.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date(),
          societyId: hRow.societyId || hRow.society_id || '',
          society: {} as any,
          resident: null,
          billEntries: [] as any,
        }
        return {
          id: e.id,
          createdAt: e.createdAt ? new Date(e.createdAt) : (e.created_at ? new Date(e.created_at) : new Date()),
          updatedAt: e.updatedAt ? new Date(e.updatedAt) : (e.updated_at ? new Date(e.updated_at) : new Date()),
          monthlyBillId: e.monthlyBillId || e.monthly_bill_id,
          monthlyBill: {} as any,
          houseId: hId,
          house,
          hv: e.hv ?? 0,
          av: e.av ?? null,
          hvAutoFilled: e.hvAutoFilled !== undefined ? !!e.hvAutoFilled : !!e.hv_auto_filled,
          unit: e.unit ?? null,
          falo: e.falo ?? null,
          v: e.v ?? 600,
          total: e.total ?? null,
          aa: e.aa ?? null,
          b: e.b ?? null,
          dan: e.dan ?? null,
          wch: e.wch ?? null,
          isNegative: e.isNegative !== undefined ? !!e.isNegative : !!e.is_negative,
          isManualHv: e.isManualHv !== undefined ? !!e.isManualHv : !!e.is_manual_hv,
        }
      })

      entries.sort((a, b) => {
        const numA = parseInt(a.house.houseNo, 10)
        const numB = parseInt(b.house.houseNo, 10)
        return (isNaN(numA) || isNaN(numB)) ? a.house.houseNo.localeCompare(b.house.houseNo) : numA - numB
      })

      return {
        id: billRow.id,
        year: billRow.year,
        month: billRow.month,
        status: (billRow.status || 'DRAFT') as BillStatus,
        notes: billRow.notes ?? null,
        createdAt: billRow.createdAt ? new Date(billRow.createdAt) : new Date(),
        updatedAt: billRow.updatedAt ? new Date(billRow.updatedAt) : new Date(),
        publishedAt: billRow.publishedAt ? new Date(billRow.publishedAt) : null,
        societyId: billRow.societyId || billRow.society_id,
        society,
        entries,
      }
    },

    async findEntry(entryId: string): Promise<(BillEntry & { monthlyBill?: MonthlyBill }) | null> {
      const { data } = await supabase.from('bill_entries').select('*').eq('id', entryId).maybeSingle()
      if (!data) return null
      let monthlyBill: MonthlyBill | undefined = undefined
      const mbId = data.monthlyBillId || data.monthly_bill_id
      if (mbId) {
        const { data: mb } = await supabase.from('monthly_bills').select('*').eq('id', mbId).maybeSingle()
        if (mb) {
          monthlyBill = {
            id: mb.id,
            year: mb.year,
            month: mb.month,
            status: (mb.status || 'DRAFT') as BillStatus,
            notes: mb.notes ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            publishedAt: null,
            societyId: mb.societyId || mb.society_id,
            society: {} as any,
            entries: [] as any,
          }
        }
      }
      return {
        id: data.id,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        monthlyBillId: mbId,
        monthlyBill: (monthlyBill || {}) as MonthlyBill,
        houseId: data.houseId || data.house_id,
        house: {} as any,
        hv: data.hv ?? 0,
        av: data.av ?? null,
        hvAutoFilled: data.hvAutoFilled !== undefined ? !!data.hvAutoFilled : !!data.hv_auto_filled,
        unit: data.unit ?? null,
        falo: data.falo ?? null,
        v: data.v ?? 0,
        total: data.total ?? null,
        aa: data.aa ?? null,
        b: data.b ?? null,
        dan: data.dan ?? null,
        wch: data.wch ?? null,
        isNegative: data.isNegative !== undefined ? !!data.isNegative : !!data.is_negative,
        isManualHv: data.isManualHv !== undefined ? !!data.isManualHv : !!data.is_manual_hv,
      }
    },

    async updateEntry(entryId: string, update: Partial<BillEntry>): Promise<BillEntry & { house: House }> {
      const payload: any = {}
      if ('av' in update) payload.av = update.av
      if ('hv' in update) payload.hv = update.hv
      if ('hvAutoFilled' in update) { payload.hvAutoFilled = update.hvAutoFilled; payload.hv_auto_filled = update.hvAutoFilled }
      if ('isManualHv' in update) { payload.isManualHv = update.isManualHv; payload.is_manual_hv = update.isManualHv }
      if ('unit' in update) payload.unit = update.unit
      if ('falo' in update) payload.falo = update.falo
      if ('v' in update) payload.v = update.v
      if ('total' in update) payload.total = update.total
      if ('aa' in update) payload.aa = update.aa
      if ('b' in update) payload.b = update.b
      if ('dan' in update) payload.dan = update.dan
      if ('wch' in update) payload.wch = update.wch
      if ('isNegative' in update) { payload.isNegative = update.isNegative; payload.is_negative = update.isNegative }

      const { data, error } = await supabase.from('bill_entries').update(payload).eq('id', entryId).select().single()
      if (error || !data) throw new Error(error?.message || 'Update failed')

      const hId = data.houseId || data.house_id
      const { data: hRow } = await supabase.from('houses').select('*').eq('id', hId).maybeSingle()
      const house: House = {
        id: hRow?.id || hId,
        houseNo: hRow?.houseNo || hRow?.house_no || '',
        floor: hRow?.floor ?? null,
        isActive: hRow?.isActive !== undefined ? !!hRow.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date(),
        societyId: hRow?.societyId || hRow?.society_id || '',
        society: {} as any,
        resident: null,
        billEntries: [] as any,
      }

      return {
        id: data.id,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        monthlyBillId: data.monthlyBillId || data.monthly_bill_id,
        monthlyBill: {} as any,
        houseId: hId,
        house,
        hv: data.hv ?? 0,
        av: data.av ?? null,
        hvAutoFilled: data.hvAutoFilled !== undefined ? !!data.hvAutoFilled : !!data.hv_auto_filled,
        unit: data.unit ?? null,
        falo: data.falo ?? null,
        v: data.v ?? 0,
        total: data.total ?? null,
        aa: data.aa ?? null,
        b: data.b ?? null,
        dan: data.dan ?? null,
        wch: data.wch ?? null,
        isNegative: data.isNegative !== undefined ? !!data.isNegative : !!data.is_negative,
        isManualHv: data.isManualHv !== undefined ? !!data.isManualHv : !!data.is_manual_hv,
      }
    },

    async updateBill(billId: string, update: Partial<MonthlyBill>): Promise<MonthlyBill & { entries?: Array<BillEntry & { house: House }> }> {
      const payload: any = {}
      if ('status' in update) payload.status = update.status
      if ('notes' in update) payload.notes = update.notes
      if ('publishedAt' in update) {
        const val = update.publishedAt ? update.publishedAt.toISOString() : null
        payload.publishedAt = val
        payload.published_at = val
      }
      const { data, error } = await supabase.from('monthly_bills').update(payload).eq('id', billId).select().single()
      if (error || !data) throw new Error(error?.message || 'Update failed')
      return {
        id: data.id,
        year: data.year,
        month: data.month,
        status: (data.status || 'DRAFT') as BillStatus,
        notes: data.notes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : (data.published_at ? new Date(data.published_at) : null),
        societyId: data.societyId || data.society_id,
        society: {} as any,
        entries: [],
      }
    },

    async listDraftBills(societyId: string): Promise<Array<MonthlyBill & { entries?: BillEntry[] }>> {
      const { data: rawBills } = await supabase.from('monthly_bills').select('*')
      if (!rawBills) return []
      const filtered = rawBills.filter(b => (b.societyId || b.society_id) === societyId && b.status === 'DRAFT')
      return filtered.map(b => ({
        id: b.id,
        year: b.year,
        month: b.month,
        status: (b.status || 'DRAFT') as BillStatus,
        notes: b.notes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        societyId: b.societyId || b.society_id,
        society: {} as any,
        entries: [] as any,
      }))
    },

    async findEntryUnique(monthlyBillId: string, houseId: string): Promise<BillEntry | null> {
      const { data: rawEntries } = await supabase.from('bill_entries').select('*')
      if (!rawEntries) return null
      const data = rawEntries.find(e => (e.monthlyBillId || e.monthly_bill_id) === monthlyBillId && (e.houseId || e.house_id) === houseId)
      if (!data) return null
      return {
        id: data.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        monthlyBillId: data.monthlyBillId || data.monthly_bill_id,
        monthlyBill: {} as any,
        houseId: data.houseId || data.house_id,
        house: {} as any,
        hv: data.hv ?? 0,
        av: data.av ?? null,
        hvAutoFilled: data.hvAutoFilled !== undefined ? !!data.hvAutoFilled : !!data.hv_auto_filled,
        unit: data.unit ?? null,
        falo: data.falo ?? null,
        v: data.v ?? 0,
        total: data.total ?? null,
        aa: data.aa ?? null,
        b: data.b ?? null,
        dan: data.dan ?? null,
        wch: data.wch ?? null,
        isNegative: data.isNegative !== undefined ? !!data.isNegative : !!data.is_negative,
        isManualHv: data.isManualHv !== undefined ? !!data.isManualHv : !!data.is_manual_hv,
      }
    },

    async createEntry(entry: Omit<BillEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<BillEntry> {
      const { data, error } = await supabase
        .from('bill_entries')
        .insert({
          monthlyBillId: entry.monthlyBillId,
          houseId: entry.houseId,
          hv: entry.hv,
          av: entry.av,
          hvAutoFilled: entry.hvAutoFilled,
          isManualHv: entry.isManualHv,
          unit: entry.unit,
          falo: entry.falo,
          v: entry.v,
          total: entry.total,
          aa: entry.aa,
          b: entry.b,
          dan: entry.dan,
          wch: entry.wch,
          isNegative: entry.isNegative,
        })
        .select()
        .single()
      if (error || !data) throw new Error(error?.message || 'Failed to create entry')
      return {
        id: data.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        monthlyBillId: data.monthlyBillId || data.monthly_bill_id,
        monthlyBill: {} as any,
        houseId: data.houseId || data.house_id,
        house: {} as any,
        hv: data.hv ?? 0,
        av: data.av ?? null,
        hvAutoFilled: data.hvAutoFilled !== undefined ? !!data.hvAutoFilled : !!data.hv_auto_filled,
        unit: data.unit ?? null,
        falo: data.falo ?? null,
        v: data.v ?? 0,
        total: data.total ?? null,
        aa: data.aa ?? null,
        b: data.b ?? null,
        dan: data.dan ?? null,
        wch: data.wch ?? null,
        isNegative: data.isNegative !== undefined ? !!data.isNegative : !!data.is_negative,
        isManualHv: data.isManualHv !== undefined ? !!data.isManualHv : !!data.is_manual_hv,
      }
    },

    async listBills(societyId: string): Promise<Array<MonthlyBill & { _count?: { entries?: number } }>> {
      const { data: rawBills } = await supabase.from('monthly_bills').select('*')
      if (!rawBills) return []
      const { data: rawEntries } = await supabase.from('bill_entries').select('id, monthlyBillId, monthly_bill_id')

      const entryCountMap: Record<string, number> = {}
      if (rawEntries) {
        for (const e of rawEntries) {
          const mbId = e.monthlyBillId || e.monthly_bill_id
          if (mbId) entryCountMap[mbId] = (entryCountMap[mbId] || 0) + 1
        }
      }

      const filtered = rawBills.filter(b => (b.societyId || b.society_id) === societyId)
      filtered.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)

      return filtered.map(b => ({
        id: b.id,
        year: b.year,
        month: b.month,
        status: (b.status || 'DRAFT') as BillStatus,
        notes: b.notes ?? null,
        createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
        updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date(),
        publishedAt: b.publishedAt ? new Date(b.publishedAt) : (b.published_at ? new Date(b.published_at) : null),
        societyId: b.societyId || b.society_id,
        society: {} as any,
        entries: [] as any,
        _count: { entries: entryCountMap[b.id] || 0 },
      }))
    },
  }
}
