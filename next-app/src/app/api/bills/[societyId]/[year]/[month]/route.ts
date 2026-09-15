import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { BillService } from '@/lib/bill-service'
import { createSupabaseBillStore } from '@/lib/store'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ societyId: string; year: string; month: string }> }
) {
  try {
    const { societyId, year, month } = await params
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
    const bill = await svc.getMonthlyBill(societyId, Number(year), Number(month))
    return NextResponse.json({ bill })
  } catch (err) {
    const status = (err as any).status || 500
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ societyId: string; year: string; month: string }> }
) {
  try {
    const { societyId, year, month } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = ((user.app_metadata as any)?.role === 'ADMIN' ||
      (user.user_metadata as any)?.role === 'ADMIN' ||
      user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const adminClient = createAdminClient()
    const store = createSupabaseBillStore(adminClient)
    const svc = new BillService(store)

    const existing = await store.findBillUnique(societyId, Number(year), Number(month))
    if (!existing) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

    if (body.action === 'publish') {
      const updated = await svc.publishBill(existing.id)
      return NextResponse.json({ bill: updated })
    }
    if (body.action === 'unpublish') {
      const updated = await svc.unpublishBill(existing.id)
      return NextResponse.json({ bill: updated })
    }

    const { notes } = body
    const updated = await store.updateBill(existing.id, { notes })
    return NextResponse.json({ bill: updated })
  } catch (err) {
    const status = (err as any).status || 500
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status })
  }
}
