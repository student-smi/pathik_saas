import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { BillService, monthLabel } from '@/lib/bill-service'
import { createSupabaseBillStore } from '@/lib/store'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const societyId = searchParams.get('societyId')
    if (!societyId) return NextResponse.json({ error: 'societyId required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = ((user.app_metadata as any)?.role === 'ADMIN' ||
      (user.user_metadata as any)?.role === 'ADMIN' ||
      user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const store = createSupabaseBillStore(adminClient)
    const svc = new BillService(store)
    const bills = await svc.listBills(societyId)
    return NextResponse.json({ bills })
  } catch (err) {
    const status = (err as any).status || 500
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = ((user.app_metadata as any)?.role === 'ADMIN' ||
      (user.user_metadata as any)?.role === 'ADMIN' ||
      user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { societyId, year, month } = await request.json()
    if (!societyId || !year || !month) {
      return NextResponse.json({ error: 'societyId, year, month required' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const store = createSupabaseBillStore(adminClient)
    const svc = new BillService(store)
    const result = await svc.createMonthlyBill(societyId, Number(year), Number(month))
    return NextResponse.json(result)
  } catch (err) {
    const status = (err as any).status || 500
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status })
  }
}
