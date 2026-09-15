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

    const adminClient = createAdminClient()

    const { data: rawResidents } = await adminClient
      .from('residents')
      .select('*')

    const residentRow = (rawResidents || []).find((r: any) => (r.userId || r.user_id) === user.id)

    if (!residentRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const userHouseId = residentRow.houseId || residentRow.house_id

    const { data: row } = await adminClient
      .from('bill_entries')
      .select('*')
      .eq('id', entryId)
      .maybeSingle()

    if (!row || (row.houseId || row.house_id) !== userHouseId) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    const { data: mb } = await adminClient
      .from('monthly_bills')
      .select('*')
      .eq('id', row.monthlyBillId || row.monthly_bill_id)
      .maybeSingle()

    if (!mb || (mb.status !== 'PUBLISHED' && mb.status !== 'CORRECTED')) {
      return NextResponse.json({ error: 'Bill not available' }, { status: 404 })
    }

    const { data: h } = await adminClient
      .from('houses')
      .select('*')
      .eq('id', userHouseId)
      .maybeSingle()

    const societyId = h?.societyId || h?.society_id

    const { data: soc } = await adminClient
      .from('societies')
      .select('*')
      .eq('id', societyId)
      .maybeSingle()

    const house: House = {
      id: h?.id || userHouseId,
      houseNo: h?.houseNo || h?.house_no || '',
      floor: h?.floor ?? null,
      isActive: !!(h?.isActive ?? h?.is_active),
      createdAt: h?.createdAt ? new Date(h.createdAt) : new Date(),
      updatedAt: h?.updatedAt ? new Date(h.updatedAt) : new Date(),
      societyId: societyId || '',
      society: soc ? {
        id: soc.id,
        name: soc.name,
        address: soc.address ?? null,
        city: soc.city ?? null,
        isActive: !!(soc.isActive ?? soc.is_active),
        createdAt: soc.createdAt ? new Date(soc.createdAt) : new Date(),
        updatedAt: soc.updatedAt ? new Date(soc.updatedAt) : new Date(),
        adminId: soc.adminId || soc.admin_id || '',
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
      createdAt: mb.createdAt ? new Date(mb.createdAt) : new Date(),
      updatedAt: mb.updatedAt ? new Date(mb.updatedAt) : new Date(),
      publishedAt: mb.publishedAt ? new Date(mb.publishedAt) : null,
      societyId: mb.societyId || mb.society_id,
      society: {} as any,
      entries: [] as any,
    }

    const entry: BillEntry & { house: House; monthlyBill: MonthlyBill } = {
      id: row.id,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      monthlyBillId: row.monthlyBillId || row.monthly_bill_id,
      houseId: row.houseId || row.house_id,
      house,
      monthlyBill,
      hv: row.hv ?? 0,
      av: row.av ?? null,
      hvAutoFilled: !!(row.hvAutoFilled ?? row.hv_auto_filled),
      unit: row.unit ?? null,
      falo: row.falo ?? null,
      v: row.v ?? 0,
      total: row.total ?? null,
      aa: row.aa ?? null,
      b: row.b ?? null,
      dan: row.dan ?? null,
      wch: row.wch ?? null,
      isNegative: !!(row.isNegative ?? row.is_negative),
      isManualHv: !!(row.isManualHv ?? row.is_manual_hv),
    }

    return NextResponse.json({ entry })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
