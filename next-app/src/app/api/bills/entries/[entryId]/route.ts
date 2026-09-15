import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { BillService } from '@/lib/bill-service'
import { createSupabaseBillStore } from '@/lib/store'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params
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

    const societyId = body.societyId
    if (!societyId) return NextResponse.json({ error: 'societyId required' }, { status: 400 })

    if (body.hv !== undefined && body.hv !== null) {
      const updated = await svc.setManualHv(entryId, Number(body.hv), societyId)
      return NextResponse.json({ entry: updated })
    }

    if (body.av !== undefined && body.av !== null) {
      const updated = await svc.updateBillEntry(entryId, Number(body.av), societyId)
      return NextResponse.json({ entry: updated })
    }

    return NextResponse.json({ error: 'av or hv required' }, { status: 400 })
  } catch (err) {
    const status = (err as any).status || 500
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status })
  }
}
