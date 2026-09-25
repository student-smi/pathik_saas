import { NextResponse } from 'next/server'
import { getD1, initD1Tables } from '@/lib/d1/db'

export async function GET() {
  try {
    const db = await getD1()
    if (!db) {
      return NextResponse.json({ success: false, error: 'Cloudflare D1 binding (DB) not available' }, { status: 500 })
    }

    await initD1Tables(db)

    const userCount: any = await db.prepare('SELECT count(*) as count FROM users').first()
    const houseCount: any = await db.prepare('SELECT count(*) as count FROM houses').first()

    return NextResponse.json({
      success: true,
      message: 'Cloudflare D1 tables initialized and seeded successfully',
      users: userCount?.count || 0,
      houses: houseCount?.count || 0,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
