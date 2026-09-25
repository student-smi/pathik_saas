import { NextResponse } from 'next/server'
import { getD1, initD1Tables } from '@/lib/d1/db'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const force = url.searchParams.get('force') === 'true'

    const db = await getD1()
    if (!db) {
      return NextResponse.json({ success: false, error: 'Cloudflare D1 binding (DB) not available' }, { status: 500 })
    }

    await initD1Tables(db, force || true)

    const userCount: any = await db.prepare('SELECT count(*) as count FROM users').first()
    const houseCount: any = await db.prepare('SELECT count(*) as count FROM houses').first()
    const billCount: any = await db.prepare('SELECT count(*) as count FROM monthly_bills').first()
    const entryCount: any = await db.prepare('SELECT count(*) as count, SUM(total) as sumTotal FROM bill_entries').first()

    return NextResponse.json({
      success: true,
      message: 'Cloudflare D1 fully seeded with all house accounts and July-August 2026 bill',
      users: userCount?.count || 0,
      houses: houseCount?.count || 0,
      bills: billCount?.count || 0,
      billEntries: entryCount?.count || 0,
      grandTotal: entryCount?.sumTotal || 0,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
