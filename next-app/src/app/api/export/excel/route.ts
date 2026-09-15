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

    // 1. Fetch monthly bills
    const { data: rawBills } = await adminClient
      .from('monthly_bills')
      .select('*')

    const billRow = (rawBills || []).find((b: any) =>
      (b.societyId || b.society_id) === societyId &&
      Number(b.year) === Number(year) &&
      Number(b.month) === Number(month)
    )

    if (!billRow) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

    // 2. Fetch entries and houses
    const { data: rawEntries } = await adminClient.from('bill_entries').select('*')
    const { data: rawHouses } = await adminClient.from('houses').select('*')

    const houseMap: Record<string, any> = {}
    ;(rawHouses || []).forEach((h: any) => { houseMap[h.id] = h })

    const billEntries = (rawEntries || [])
      .filter((e: any) => (e.monthlyBillId || e.monthly_bill_id) === billRow.id)
      .map((e: any) => {
        const houseId = e.houseId || e.house_id
        return {
          ...e,
          house: houseMap[houseId] || {}
        }
      })
      .sort((a, b) => {
        const houseNoA = a.house?.houseNo || a.house?.house_no || '0'
        const houseNoB = b.house?.houseNo || b.house?.house_no || '0'
        const numA = parseInt(houseNoA, 10)
        const numB = parseInt(houseNoB, 10)
        return (isNaN(numA) || isNaN(numB)) ? houseNoA.localeCompare(houseNoB) : numA - numB
      })

    const rows = billEntries.map(e => ({
      'House No.': e.house?.houseNo || e.house?.house_no || '',
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
