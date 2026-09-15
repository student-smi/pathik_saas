import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { BillEntry, MonthlyBill } from '@/types'

function deriveRole(user: any): 'ADMIN' | 'RESIDENT' {
  return ((user?.app_metadata as any)?.role === 'ADMIN' ||
    (user?.user_metadata as any)?.role === 'ADMIN' ||
    user?.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = deriveRole(user)
    if (role !== 'RESIDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    // Fetch resident row using adminClient (bypassing RLS and supporting camelCase & snake_case)
    const { data: rawResidents } = await adminClient
      .from('residents')
      .select('*')

    const residentRow = (rawResidents || []).find((r: any) => (r.userId || r.user_id) === user.id)

    if (!residentRow) {
      return NextResponse.json({ bills: [], current: null })
    }

    const houseId = residentRow.houseId || residentRow.house_id

    // Fetch house
    const { data: house } = await adminClient
      .from('houses')
      .select('*')
      .eq('id', houseId)
      .maybeSingle()

    if (!house) {
      return NextResponse.json({ bills: [], current: null })
    }

    const societyId = house.societyId || house.society_id

    // Fetch society
    const { data: society } = await adminClient
      .from('societies')
      .select('*')
      .eq('id', societyId)
      .maybeSingle()

    // Fetch bill entries for this house
    const { data: rawEntries } = await adminClient
      .from('bill_entries')
      .select('*')

    const houseEntries = (rawEntries || []).filter((e: any) => (e.houseId || e.house_id) === houseId)

    // Fetch published or corrected monthly bills for this society
    const { data: rawBills } = await adminClient
      .from('monthly_bills')
      .select('*')

    const societyBills = (rawBills || []).filter((b: any) => 
      (b.societyId || b.society_id) === societyId && 
      (b.status === 'PUBLISHED' || b.status === 'CORRECTED')
    )

    const billMap: Record<string, any> = {}
    societyBills.forEach((b: any) => { billMap[b.id] = b })

    // Filter and map entries
    const validEntries: Array<BillEntry & { monthlyBill: MonthlyBill }> = houseEntries
      .filter((e: any) => billMap[e.monthlyBillId || e.monthly_bill_id])
      .map((e: any) => {
        const m = billMap[e.monthlyBillId || e.monthly_bill_id]
        return {
          id: e.id,
          createdAt: e.createdAt ? new Date(e.createdAt) : (e.created_at ? new Date(e.created_at) : new Date()),
          updatedAt: e.updatedAt ? new Date(e.updatedAt) : (e.updated_at ? new Date(e.updated_at) : new Date()),
          monthlyBillId: e.monthlyBillId || e.monthly_bill_id,
          houseId: e.houseId || e.house_id,
          house: {
            id: house.id,
            houseNo: house.houseNo || house.house_no || '',
            societyId,
            society: society || {}
          } as any,
          monthlyBill: {
            id: m.id,
            year: m.year,
            month: m.month,
            status: m.status,
            notes: m.notes ?? null,
            createdAt: m.createdAt ? new Date(m.createdAt) : (m.created_at ? new Date(m.created_at) : new Date()),
            updatedAt: m.updatedAt ? new Date(m.updatedAt) : (m.updated_at ? new Date(m.updated_at) : new Date()),
            publishedAt: m.publishedAt ? new Date(m.publishedAt) : (m.published_at ? new Date(m.published_at) : null),
            societyId: m.societyId || m.society_id,
            society: society || {} as any,
            entries: [] as any,
          },
          hv: e.hv ?? 0,
          av: e.av ?? null,
          hvAutoFilled: !!(e.hvAutoFilled ?? e.hv_auto_filled),
          unit: e.unit ?? null,
          falo: e.falo ?? null,
          v: e.v ?? 0,
          total: e.total ?? null,
          aa: e.aa ?? null,
          b: e.b ?? null,
          dan: e.dan ?? null,
          wch: e.wch ?? null,
          isNegative: !!(e.isNegative ?? e.is_negative),
          isManualHv: !!(e.isManualHv ?? e.is_manual_hv),
        }
      })
      .sort((a, b) => {
        if (b.monthlyBill.year !== a.monthlyBill.year) return b.monthlyBill.year - a.monthlyBill.year
        return b.monthlyBill.month - a.monthlyBill.month
      })

    const current = validEntries[0] || null
    const houseNo = house.houseNo || house.house_no || ''
    const societyName = society?.name || ''

    return NextResponse.json({ bills: validEntries, current, houseNo, societyName })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
