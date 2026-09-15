import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Resident, User, House, UserRole } from '@/types'

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
    const { data: rawHouses } = await adminClient.from('houses').select('*')
    const societyHouses = (rawHouses as any[] || []).filter(h => (h.societyId || h.society_id) === societyId)
    const houseIds = societyHouses.map(h => h.id)
    const houseMap: Record<string, any> = {}
    for (const h of societyHouses) houseMap[h.id] = h

    const { data: rawResidents } = await adminClient.from('residents').select('*')
    const { data: rawUsers } = await adminClient.from('users').select('*')

    const userMap: Record<string, any> = {}
    if (rawUsers) {
      for (const u of rawUsers) userMap[u.id] = u
    }

    const filtered = (rawResidents as any[] || []).filter(r => houseIds.includes(r.houseId || r.house_id))

    const residents: Array<Resident & { house: House; user: User & { isActive: boolean } }> = filtered.map(r => {
      const hId = r.houseId || r.house_id
      const h = houseMap[hId] || {}
      const uId = r.userId || r.user_id
      const u = userMap[uId] || {}
      return {
        id: r.id,
        name: r.name,
        phone: r.phone ?? null,
        createdAt: r.createdAt ? new Date(r.createdAt) : (r.created_at ? new Date(r.created_at) : new Date()),
        updatedAt: r.updatedAt ? new Date(r.updatedAt) : (r.updated_at ? new Date(r.updated_at) : new Date()),
        houseId: hId,
        house: {
          id: h.id || hId,
          houseNo: h.houseNo || h.house_no || '',
          floor: h.floor ?? null,
          isActive: h.isActive !== undefined ? !!h.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date(),
          societyId: h.societyId || h.society_id || '',
          society: {} as any,
          resident: null,
          billEntries: [] as any,
        },
        userId: uId,
        user: {
          id: u.id || uId,
          email: u.email || '',
          passwordHash: '',
          role: 'RESIDENT' as UserRole,
          isActive: u.isActive !== undefined ? !!u.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date(),
          adminSocieties: [],
          resident: null,
        },
      }
    }).sort((a, b) => {
      const numA = parseInt(a.house.houseNo, 10)
      const numB = parseInt(b.house.houseNo, 10)
      return (isNaN(numA) || isNaN(numB)) ? a.house.houseNo.localeCompare(b.house.houseNo) : numA - numB
    })

    return NextResponse.json({ residents })
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

    const { name, phone, houseId, email, password } = await request.json()
    if (!name || !name.trim() || !houseId) {
      return NextResponse.json({ error: 'name and houseId required' }, { status: 400 })
    }

    const autoEmail = email && email.trim() !== '' ? email.trim() : (() => {
      const firstName = name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '')
      return firstName ? `${firstName}@gmail.com` : `resident_${Date.now()}@gmail.com`
    })()
    const autoPassword = password || 'Resident@123'

    const adminClient = createAdminClient()
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: autoEmail,
      password: autoPassword,
      email_confirm: true,
      user_metadata: { role: 'RESIDENT' },
      app_metadata: { role: 'RESIDENT' },
    })

    if (authError || !authData.user) {
      const fallbackId = `u-${Date.now()}`
      const { data: manualUser } = await adminClient
        .from('users')
        .insert({
          id: fallbackId,
          email: autoEmail,
          role: 'RESIDENT',
          isActive: true,
        })
        .select()
        .maybeSingle()

      const newUserId = manualUser?.id || fallbackId

      const { data: residentData, error: resErr } = await adminClient
        .from('residents')
        .insert({
          name: name.trim(),
          phone: phone?.trim() || null,
          houseId: houseId,
          userId: newUserId,
        })
        .select()
        .single()

      if (resErr || !residentData) throw new Error(resErr?.message || 'Failed to create resident')

      return NextResponse.json({
        resident: residentData as any,
        credentials: { email: autoEmail, password: autoPassword },
      })
    }

    const userId = authData.user.id
    await adminClient
      .from('users')
      .upsert({
        id: userId,
        email: autoEmail,
        role: 'RESIDENT',
        isActive: true,
      }, { onConflict: 'id' })

    const { data: residentData, error: resErr } = await adminClient
      .from('residents')
      .insert({
        name: name.trim(),
        phone: phone?.trim() || null,
        houseId: houseId,
        userId: userId,
      })
      .select()
      .single()

    if (resErr || !residentData) throw new Error(resErr?.message || 'Failed to create resident')

    const resident: Resident & { house: House; user: User } = {
      id: residentData.id,
      name: residentData.name,
      phone: residentData.phone ?? null,
      createdAt: residentData.createdAt ? new Date(residentData.createdAt) : new Date(),
      updatedAt: residentData.updatedAt ? new Date(residentData.updatedAt) : new Date(),
      houseId: residentData.houseId || residentData.house_id,
      house: {} as any,
      userId: residentData.userId || residentData.user_id,
      user: {
        id: userId,
        email: autoEmail,
        passwordHash: '',
        role: 'RESIDENT',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        adminSocieties: [],
        resident: null,
      },
    }

    return NextResponse.json({
      resident,
      credentials: { email: autoEmail, password: autoPassword },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
