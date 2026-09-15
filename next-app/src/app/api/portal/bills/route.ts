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

    const { data: residentRow } = await supabase
      .from('residents')
      .select('id, house_id, house:houses(id, house_no, society_id, society:societies(id, name))')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!residentRow || !residentRow.house_id) {
      return NextResponse.json({ bills: [], current: null })
    }

    const house = residentRow.house as any || {}
    const houseId = residentRow.house_id
    const societyId = house.society_id

    const adminClient = createAdminClient()
    const { data: entries } = await adminClient
      .from('bill_entries')
      .select(`
        *,
        monthly_bill:monthly_bills(*)
      `)
      .eq('house_id', houseId)
      .eq('monthly_bill.society_id', societyId)
      .in('monthly_bill.status', ['PUBLISHED', 'CORRECTED'])
      .order('monthly_bill.year', { ascending: false, foreignTable: 'monthly_bills' })
      .order('monthly_bill.month', { ascending: false, foreignTable: 'monthly_bills' })

    const bills: Array<BillEntry & { monthlyBill: MonthlyBill }> = (entries as any[] || []).map(e => {
      const m = e.monthly_bill || {}
      return {
        id: e.id,
        createdAt: e.created_at ? new Date(e.created_at) : new Date(),
        updatedAt: e.updated_at ? new Date(e.updated_at) : new Date(),
        monthlyBillId: e.monthly_bill_id,
        houseId: e.house_id,
        house: {} as any,
        monthlyBill: {
          id: m.id,
          year: m.year,
          month: m.month,
          status: m.status,
          notes: m.notes ?? null,
          createdAt: m.created_at ? new Date(m.created_at) : new Date(),
          updatedAt: m.updated_at ? new Date(m.updated_at) : new Date(),
          publishedAt: m.published_at ? new Date(m.published_at) : null,
          societyId: m.society_id,
          society: house.society ? {
            id: house.society.id,
            name: house.society.name,
            address: null,
            city: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            adminId: '',
            admin: {} as any,
            houses: [] as any,
            monthlyBills: [] as any,
            calcConfigs: [] as any,
          } : {} as any,
          entries: [] as any,
        },
        hv: e.hv ?? 0,
        av: e.av ?? null,
        hvAutoFilled: !!e.hv_auto_filled,
        unit: e.unit ?? null,
        falo: e.falo ?? null,
        v: e.v ?? 0,
        total: e.total ?? null,
        aa: e.aa ?? null,
        b: e.b ?? null,
        dan: e.dan ?? null,
        wch: e.wch ?? null,
        isNegative: !!e.is_negative,
        isManualHv: !!e.is_manual_hv,
      }
    })

    const current = bills[0] || null
    return NextResponse.json({ bills, current, houseNo: house.house_no, societyName: house.society?.name })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
