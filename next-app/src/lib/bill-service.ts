import { calculateEntry, configsToMap, type CalcConfigMap, type CalculatedEntry } from './calculation'
import type { Society, House, MonthlyBill, BillEntry, CalcConfig, BillStatus } from '@/types'

/**
 * BILL SERVICE
 * ─────────────────────────────────────────────────────────────────────
 * Core business logic for the monthly bill carry-forward loop.
 *
 * THE MONTHLY LOOP:
 *   Previous Month A.V → Current Month H.V
 *   Admin enters Current Month A.V
 *   System calculates UNIT, FALO, V, TOTAL
 *   Save → Current A.V becomes next month's H.V
 *
 * DATA STORE ABSTRACTION:
 *   To keep this module pure (testable, framework-agnostic), all
 *   persistence calls go through the `BillStore` interface.
 *   Production Route Handlers wire it to Supabase / Prisma; tests
 *   provide an in-memory implementation.
 * ─────────────────────────────────────────────────────────────────────
 */

// ─── Public Return Types ────────────────────────────────────────────────

export interface CreateBillResult {
  bill: MonthlyBill & { entries: Array<BillEntry & { house: House }>; society: Society }
  hasPrevBill: boolean
  prevMonth: string
  missingPrevHouses: string[]
}

// ─── Data Store Interface ───────────────────────────────────────────────

export interface BillStore {
  findBillUnique(societyId: string, year: number, month: number): Promise<MonthlyBill | null>
  findBillById(id: string): Promise<(MonthlyBill & { entries?: BillEntry[] }) | null>
  listHouses(societyId: string): Promise<House[]>
  findPreviousBill(societyId: string, year: number, month: number): Promise<(MonthlyBill & { entries: BillEntry[] }) | null>
  listConfigs(societyId: string): Promise<CalcConfig[]>
  createBill(data: { societyId: string; year: number; month: number; status: BillStatus }): Promise<MonthlyBill>
  createEntries(entries: Omit<BillEntry, 'id' | 'createdAt' | 'updatedAt' | 'house'>[]): Promise<void>
  getFullBill(id: string): Promise<(MonthlyBill & { entries: Array<BillEntry & { house: House }>; society: Society }) | null>
  findEntry(entryId: string): Promise<(BillEntry & { monthlyBill?: MonthlyBill }) | null>
  updateEntry(entryId: string, data: Partial<BillEntry>): Promise<BillEntry & { house: House }>
  updateBill(billId: string, data: Partial<MonthlyBill>): Promise<MonthlyBill & { entries?: Array<BillEntry & { house: House }> }>
  listDraftBills(societyId: string): Promise<Array<MonthlyBill & { entries?: BillEntry[] }>>
  findEntryUnique(monthlyBillId: string, houseId: string): Promise<BillEntry | null>
  createEntry(entry: Omit<BillEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<BillEntry>
  listBills(societyId: string): Promise<Array<MonthlyBill & { _count?: { entries?: number } }>>
  deleteBill(billId: string): Promise<void>
}

// ─── Pure helpers ────────────────────────────────────────────────────────

const BIMONTHLY_LABELS: Record<number, string> = {
  1: 'January - February', 2: 'January - February',
  3: 'March - April', 4: 'March - April',
  5: 'May - June', 6: 'May - June',
  7: 'July - August', 8: 'July - August',
  9: 'September - October', 10: 'September - October',
  11: 'November - December', 12: 'November - December',
}

export function monthLabel(year: number, month: number): string {
  return `${BIMONTHLY_LABELS[month] || 'Period'} ${year}`
}

export function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month <= 2) return { year: year - 1, month: 12 }
  return { year, month: month - 2 }
}

export function extractPrevAvMap(prevBill: { entries?: Array<Pick<BillEntry, 'houseId' | 'av'>> }): Record<string, number> {
  const map: Record<string, number> = {}
  for (const entry of prevBill.entries ?? []) {
    if (entry.av !== null && entry.av !== undefined && !Number.isNaN(entry.av)) {
      map[entry.houseId] = entry.av as number
    }
  }
  return map
}

function assert(condition: any, message: string, status: number = 400): asserts condition {
  if (!condition) {
    const err = new Error(message) as Error & { status?: number }
    err.status = status
    throw err
  }
}

// ─── Service implementation ─────────────────────────────────────────────

export class BillService {
  constructor(private readonly store: BillStore) {}

  /**
   * CREATE MONTHLY BILL
   *
   * 1. Check if bill for [societyId, year, month] already exists → error 409
   * 2. Load all active houses for the society
   * 3. For each house: look up previous month's A.V → use as H.V
   *    If no previous month exists: H.V = 0 (manual entry required)
   * 4. Create MonthlyBill + BillEntry records
   */
  async createMonthlyBill(societyId: string, year: number, month: number): Promise<CreateBillResult> {
    assert(year >= 2000 && year <= 2999, 'Invalid year', 400)
    assert(month >= 1 && month <= 12, 'Invalid month', 400)

    const existing = await this.store.findBillUnique(societyId, year, month)
    assert(!existing, `Bill for ${monthLabel(year, month)} already exists`, 409)

    const houses = (await this.store.listHouses(societyId)).filter(h => (h as any).isActive !== false)
    assert(houses.length > 0, 'No active houses found in this society', 400)

    const prevBill = await this.store.findPreviousBill(societyId, year, month)
    const prevAvMap = prevBill ? extractPrevAvMap(prevBill) : {}
    const hasPrevBill = !!prevBill

    const monthlyBill = await this.store.createBill({ societyId, year, month, status: 'DRAFT' })

    const entriesData = houses.map(house => {
      const prevAv = prevAvMap[house.id]
      const hvAutoFilled = hasPrevBill && prevAv !== undefined
      return {
        monthlyBillId: monthlyBill.id,
        houseId: house.id,
        hv: hvAutoFilled ? prevAv : 0,
        hvAutoFilled,
        isManualHv: !hvAutoFilled,
        av: null,
        unit: null,
        falo: null,
        v: 600,
        total: null,
        aa: null, b: null, dan: null, wch: null,
        isNegative: false,
      } as Omit<BillEntry, 'id' | 'createdAt' | 'updatedAt' | 'house'>
    })

    await this.store.createEntries(entriesData)

    const fullBill = await this.store.getFullBill(monthlyBill.id)
    assert(fullBill, 'Created bill not found', 500)

    const missingPrevHouses = hasPrevBill
      ? houses.filter(h => prevAvMap[h.id] === undefined).map(h => h.houseNo)
      : houses.map(h => h.houseNo)

    return {
      bill: fullBill,
      hasPrevBill,
      prevMonth: prevBill ? monthLabel(prevBill.year, prevBill.month) : '',
      missingPrevHouses,
    }
  }

  /**
   * GET MONTHLY BILL
   */
  async getMonthlyBill(societyId: string, year: number, month: number): Promise<MonthlyBill & { entries: Array<BillEntry & { house: House }>; society: Society }> {
    const existing = await this.store.findBillUnique(societyId, year, month)
    assert(existing, `No bill found for ${monthLabel(year, month)}`, 404)
    const full = await this.store.getFullBill(existing.id)
    assert(full, 'Bill not found', 404)
    return full
  }

  async listBills(societyId: string) {
    return this.store.listBills(societyId)
  }

  /**
   * UPDATE BILL ENTRY — Admin enters / corrects A.V.
   *
   * When A.V is saved:
   *   1. Recalculate UNIT, FALO, V, TOTAL
   *   2. Persist
   *   3. If bill was PUBLISHED, mark as CORRECTED
   */
  async updateBillEntry(entryId: string, av: number, societyId: string): Promise<BillEntry & { house: House }> {
    const entry = await this.store.findEntry(entryId)
    assert(entry, 'Bill entry not found', 404)
    assert(typeof av === 'number' && !Number.isNaN(av), 'Invalid A.V value', 400)

    const configs = await this.store.listConfigs(societyId)
    const configMap: CalcConfigMap = configsToMap(configs)
    const result: CalculatedEntry = calculateEntry(entry.hv, av, configMap)

    const updatedEntry = await this.store.updateEntry(entryId, {
      av,
      unit: result.unit,
      falo: result.falo,
      v: result.v,
      total: result.total,
      aa: result.aa,
      b: result.b,
      dan: result.dan,
      wch: result.wch,
      isNegative: result.isNegative,
    })

    const parentBill = entry.monthlyBill ?? (entry.monthlyBillId ? await this.store.findBillById(entry.monthlyBillId) : null)
    if (parentBill && parentBill.status === 'PUBLISHED') {
      await this.store.updateBill(parentBill.id, { status: 'CORRECTED' })
    }

    return updatedEntry
  }

  /**
   * MANUALLY SET H.V for an entry (when no previous month exists, or override)
   */
  async setManualHv(entryId: string, hv: number, societyId: string): Promise<BillEntry & { house: House }> {
    const entry = await this.store.findEntry(entryId)
    assert(entry, 'Bill entry not found', 404)
    assert(typeof hv === 'number' && !Number.isNaN(hv), 'Invalid H.V value', 400)

    const updateData: Partial<BillEntry> = {
      hv,
      isManualHv: true,
      hvAutoFilled: false,
    }

    if (entry.av !== null && entry.av !== undefined) {
      const configs = await this.store.listConfigs(societyId)
      const configMap = configsToMap(configs)
      const result = calculateEntry(hv, entry.av, configMap)
      Object.assign(updateData, {
        unit: result.unit,
        falo: result.falo,
        v: result.v,
        total: result.total,
        aa: result.aa,
        b: result.b,
        dan: result.dan,
        wch: result.wch,
        isNegative: result.isNegative,
      })
    }

    return this.store.updateEntry(entryId, updateData)
  }

  /**
   * PUBLISH BILL — DRAFT → PUBLISHED
   */
  async publishBill(billId: string): Promise<MonthlyBill & { entries: Array<BillEntry & { house: House }> }> {
    const bill = await this.store.findBillById(billId)
    assert(bill, 'Bill not found', 404)
    assert(bill.status !== 'PUBLISHED', 'Bill is already published', 409)

    return this.store.updateBill(billId, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    }) as Promise<MonthlyBill & { entries: Array<BillEntry & { house: House }> }>
  }

  /**
   * UNPUBLISH — revert to DRAFT
   */
  async unpublishBill(billId: string): Promise<MonthlyBill> {
    const bill = await this.store.findBillById(billId)
    assert(bill, 'Bill not found', 404)
    return this.store.updateBill(billId, { status: 'DRAFT', publishedAt: null })
  }

  /**
   * ADD A NEW HOUSE TO ALL EXISTING DRAFT BILLS
   *
   * PUBLISHED bills are never touched — historical data is preserved.
   */
  async addHouseToDraftBills(houseId: string, societyId: string): Promise<void> {
    const draftBills = await this.store.listDraftBills(societyId)
    for (const bill of draftBills) {
      const exists = await this.store.findEntryUnique(bill.id, houseId)
      if (exists) continue

      const prevBill = await this.store.findPreviousBill(societyId, bill.year, bill.month)
      const prevAvMap = prevBill ? extractPrevAvMap(prevBill) : {}
      const prevAv = prevAvMap[houseId]
      const hvAutoFilled = prevAv !== undefined

      await this.store.createEntry({
        monthlyBillId: bill.id,
        houseId,
        hv: hvAutoFilled ? prevAv : 0,
        hvAutoFilled,
        isManualHv: !hvAutoFilled,
        av: null,
        unit: null,
        falo: null,
        v: 600,
        total: null,
        aa: null, b: null, dan: null, wch: null,
        isNegative: false,
      } as any)
    }
  }

  async deleteBill(billId: string): Promise<void> {
    const bill = await this.store.findBillById(billId)
    assert(bill, 'Bill not found', 404)
    await this.store.deleteBill(billId)
  }
}
