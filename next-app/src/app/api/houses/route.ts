import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { House } from '@/types'
import { BillService } from '@/lib/bill-service'
import { createSupabaseBillStore } from '@/lib/store'
import { compareHouseNos } from '@/lib/houseUtils'

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

    const adminClient = (await import('@/lib/supabase/server')).createAdminClient()
    const { data: rawData, error } = await adminClient
      .from('houses')
      .select('*')

    if (error) {
      console.error('Houses fetch error:', error)
      throw error
    }

    const { data: residentsData } = await adminClient
      .from('residents')
      .select('*')

    const { data: usersData } = await adminClient
      .from('users')
      .select('id, email, isActive, is_active')

    const userMap: Record<string, any> = {}
    if (usersData) {
      for (const u of usersData) userMap[u.id] = u
    }

    const residentMap: Record<string, any> = {}
    if (residentsData) {
      for (const r of residentsData) {
        const hId = r.houseId || r.house_id
        if (hId) residentMap[hId] = r
      }
    }

    const filtered = (rawData as any[] || []).filter(h => (h.societyId || h.society_id) === societyId)

    interface HouseWithResident extends Omit<House, 'resident'> {
      resident?: any
    }

    const houses: HouseWithResident[] = filtered.map(h => {
      const r = residentMap[h.id]
      const u = r ? userMap[r.userId || r.user_id] : null
      let resident = null
      if (r) {
        resident = {
          id: r.id,
          name: r.name,
          phone: r.phone ?? null,
          createdAt: r.createdAt ? new Date(r.createdAt) : (r.created_at ? new Date(r.created_at) : new Date()),
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : (r.updated_at ? new Date(r.updated_at) : new Date()),
          houseId: r.houseId || r.house_id,
          house: {} as any,
          userId: r.userId || r.user_id,
          user: u ? {
            id: u.id,
            email: u.email,
            passwordHash: '',
            role: 'RESIDENT',
            isActive: u.isActive !== undefined ? !!u.isActive : !!u.is_active,
            createdAt: new Date(),
            updatedAt: new Date(),
            adminSocieties: [],
            resident: null,
          } : null,
        }
      }
      return {
        id: h.id,
        houseNo: h.houseNo || h.house_no || '',
        floor: h.floor ?? null,
        isActive: h.isActive !== undefined ? !!h.isActive : !!h.is_active,
        createdAt: h.createdAt ? new Date(h.createdAt) : (h.created_at ? new Date(h.created_at) : new Date()),
        updatedAt: h.updatedAt ? new Date(h.updatedAt) : (h.updated_at ? new Date(h.updated_at) : new Date()),
        societyId: h.societyId || h.society_id,
        society: {} as any,
        resident,
        billEntries: [] as any,
      }
    }).sort((a, b) => compareHouseNos(a.houseNo, b.houseNo))

    return NextResponse.json({ houses })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
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

    const { societyId, houseNo, floor } = await request.json()
    if (!societyId || !houseNo || !houseNo.trim()) {
      return NextResponse.json({ error: 'societyId and houseNo required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('houses')
      .insert({
        society_id: societyId,
        house_no: houseNo.trim(),
        floor: floor?.trim() || null,
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message || 'Failed to create house')

    const adminClient = (await import('@/lib/supabase/server')).createAdminClient()
    const store = createSupabaseBillStore(adminClient)
    const billService = new BillService(store)
    try {
      await billService.addHouseToDraftBills(data.id, societyId)
    } catch {}

    const house: House = {
      id: data.id,
      houseNo: data.house_no,
      floor: data.floor ?? null,
      isActive: !!data.is_active,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
      societyId: data.society_id,
      society: {} as any,
      resident: null,
      billEntries: [] as any,
    }

    return NextResponse.json({ house })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
