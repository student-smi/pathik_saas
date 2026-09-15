import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const { data: currentBills } = await adminClient
      .from('monthly_bills')
      .select('id, status, year, month')
      .eq('year', currentYear)
      .eq('month', currentMonth)

    const billsCount = currentBills?.length || 0

    const { data: pendingEntries } = await adminClient
      .from('bill_entries')
      .select('id')
      .is('av', null)

    return NextResponse.json({
      billsThisMonth: billsCount,
      pendingEntry: pendingEntries?.length || 0
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
