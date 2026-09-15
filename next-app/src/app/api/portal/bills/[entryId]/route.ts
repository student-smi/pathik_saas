import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { BillEntry, MonthlyBill, House, Society } from '@/types'

function deriveRole(user: any): 'ADMIN' | 'RESIDENT' {
  return ((user?.app_metadata as any)?.role === 'ADMIN' ||
    (user?.user_metadata as any)?.role === 'ADMIN' ||
    user?.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = deriveRole(user)
    if (role !== 'RESIDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: residentRow } = await supabase
      .from('residents')
      .select('id, house_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!residentRow || !residentRow.house_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()
    const { data: row } = await adminClient
      .from('bill_entries')
      .select(`
        *,
        monthly_bill:monthly_bills(*),
        house:houses(*, society:societies(*))
      `)
      .eq('id', entryId)
      .eq('house_id', residentRow.house_id)
      .maybeSingle()

    if (!row) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

    const mb = row.monthly_bill
    if (!mb || (mb.status !== 'PUBLISHED' && mb.status !== 'CORRECTED')) {
      return NextResponse.json({ error: 'Bill not available' }, { status: 404 })
    }

    const h = row.house || {}
    const soc = h.society || {}
    const house: House = {
      id: h.id,
      houseNo: h.house_no,
      floor: h.floor ?? null,
      isActive: !!h.is_active,
      createdAt: h.created_at ? new Date(h.created_at) : new Date(),
      updatedAt: h.updated_at ? new Date(h.updated_at) : new Date(),
      societyId: h.society_id,
      society: soc ? {
        id: soc.id,
        name: soc.name,
        address: soc.address ?? null,
        city: soc.city ?? null,
        isActive: !!soc.is_active,
        createdAt: soc.created_at ? new Date(soc.created_at) : new Date(),
        updatedAt: soc.updated_at ? new Date(soc.updated_at) : new Date(),
        adminId: soc.admin_id,
        admin: {} as any,
        houses: [] as any,
        monthlyBills: [] as any,
        calcConfigs: [] as any,
      } : {} as any,
      resident: null,
      billEntries: [] as any,
    }

    const monthlyBill: MonthlyBill = {
      id: mb.id,
      year: mb.year,
      month: mb.month,
      status: mb.status,
      notes: mb.notes ?? null,
      createdAt: mb.created_at ? new Date(mb.created_at) : new Date(),
      updatedAt: mb.updated_at ? new Date(mb.updated_at) : new Date(),
      publishedAt: mb.published_at ? new Date(mb.published_at) : null,
      societyId: mb.society_id,
      society: {} as any,
      entries: [] as any,
    }

    const entry: BillEntry & { house: House; monthlyBill: MonthlyBill } = {
      id: row.id,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
      monthlyBillId: row.monthly_bill_id,
      houseId: row.house_id,
      house,
      monthlyBill,
      hv: row.hv ?? 0,
      av: row.av ?? null,
      hvAutoFilled: !!row.hv_auto_filled,
      unit: row.unit ?? null,
      falo: row.falo ?? null,
      v: row.v ?? 0,
      total: row.total ?? null,
      aa: row.aa ?? null,
      b: row.b ?? null,
      dan: row.dan ?? null,
      wch: row.wch ?? null,
      isNegative: !!row.is_negative,
      isManualHv: !!row.is_manual_hv,
    }

    return NextResponse.json({ entry })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
