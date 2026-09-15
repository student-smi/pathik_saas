import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const societyId = searchParams.get('societyId')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    if (!societyId || !year || !month) {
      return NextResponse.json({ error: 'societyId, year, month required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = ((user.app_metadata as any)?.role === 'ADMIN' ||
      (user.user_metadata as any)?.role === 'ADMIN' ||
      user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: billRow } = await adminClient
      .from('monthly_bills')
      .select(`
        *,
        entries:bill_entries(*, house:houses(*))
      `)
      .eq('society_id', societyId)
      .eq('year', Number(year))
      .eq('month', Number(month))
      .maybeSingle()

    if (!billRow) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

    const rows = (billRow.entries as any[] || []).map(e => ({
      'House No.': e.house?.house_no || '',
      'H.V': e.hv ?? 0,
      'A.V': e.av ?? '',
      'UNIT': e.unit ?? '',
      'V': e.v ?? 0,
      'FALO': e.falo ?? '',
      'AA': e.aa ?? '',
      'B': e.b ?? '',
      'DAN': e.dan ?? '',
      'WCH': e.wch ?? '',
      'TOTAL': e.total ?? '',
    }))

    const BILL_PERIOD_MAP: Record<number, string> = {
      1: 'Jan-Feb', 2: 'Jan-Feb', 3: 'Mar-Apr', 4: 'Mar-Apr',
      5: 'May-Jun', 6: 'May-Jun', 7: 'Jul-Aug', 8: 'Jul-Aug',
      9: 'Sep-Oct', 10: 'Sep-Oct', 11: 'Nov-Dec', 12: 'Nov-Dec',
    }
    const period = `${BILL_PERIOD_MAP[billRow.month] || 'Period'} ${billRow.year}`

    const csvHeader = Object.keys(rows[0] || {}).join(',')
    const csvRows = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = [csvHeader, ...csvRows].join('\n')
    const bom = '\uFEFF'

    return new NextResponse(bom + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bill-${societyId}-${period}.csv"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
