import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { compareHouseNos } from '@/lib/houseUtils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const societyId = searchParams.get('societyId')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const billId = searchParams.get('billId')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = ((user.app_metadata as any)?.role === 'ADMIN' ||
      (user.user_metadata as any)?.role === 'ADMIN' ||
      user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    // Fetch all monthly bills to match flexibly
    const { data: rawBills } = await adminClient
      .from('monthly_bills')
      .select('*')

    let billRow: any = null

    // 1. Try matching by billId
    if (billId) {
      billRow = (rawBills || []).find((b: any) => String(b.id) === String(billId))
    }

    // 2. Try matching by societyId + year + month
    if (!billRow && societyId) {
      billRow = (rawBills || []).find((b: any) =>
        String(b.societyId || b.society_id) === String(societyId) &&
        (year ? String(b.year) === String(year) : true) &&
        (month ? String(b.month) === String(month) : true)
      )
    }

    // 3. Fallback: Match by societyId (get latest bill)
    if (!billRow && societyId) {
      const societyBills = (rawBills || [])
        .filter((b: any) => String(b.societyId || b.society_id) === String(societyId))
        .sort((a: any, b: any) => (Number(b.year) - Number(a.year)) || (Number(b.month) - Number(a.month)))
      billRow = societyBills[0] || null
    }

    // 4. Fallback: Pick latest bill in DB
    if (!billRow && rawBills && rawBills.length > 0) {
      const sortedBills = [...rawBills].sort((a: any, b: any) => (Number(b.year) - Number(a.year)) || (Number(b.month) - Number(a.month)))
      billRow = sortedBills[0] || null
    }

    if (!billRow) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

    // Fetch entries and houses
    const { data: rawEntries } = await adminClient.from('bill_entries').select('*')
    const { data: rawHouses } = await adminClient.from('houses').select('*')

    const houseMap: Record<string, any> = {}
    ;(rawHouses || []).forEach((h: any) => { houseMap[h.id] = h })

    const billEntries = (rawEntries || [])
      .filter((e: any) => String(e.monthlyBillId || e.monthly_bill_id) === String(billRow.id))
      .map((e: any) => {
        const houseId = e.houseId || e.house_id
        return {
          ...e,
          house: houseMap[houseId] || {}
        }
      })
      .sort((a, b) => compareHouseNos(a.house?.houseNo || a.house?.house_no || '', b.house?.houseNo || b.house?.house_no || ''))

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
        'Content-Disposition': `attachment; filename="bill-${billRow.societyId || societyId || 'export'}-${period}.csv"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
