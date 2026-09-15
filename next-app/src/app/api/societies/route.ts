import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Society } from '@/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = ((user.app_metadata as any)?.role === 'ADMIN' ||
      (user.user_metadata as any)?.role === 'ADMIN' ||
      user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: societiesData, error: socError } = await adminClient
      .from('societies')
      .select('*')
      .order('name', { ascending: true })

    if (socError) {
      console.error('Societies fetch error:', socError)
      throw socError
    }

    const { data: housesData } = await adminClient
      .from('houses')
      .select('id, societyId')

    const houseCountMap: Record<string, number> = {}
    if (housesData) {
      for (const h of housesData) {
        const sId = (h as any).societyId || (h as any).society_id
        if (sId) {
          houseCountMap[sId] = (houseCountMap[sId] || 0) + 1
        }
      }
    }

    const societies: Array<Society & { _count?: { houses: number } }> = (societiesData as any[] || []).map(s => ({
      id: s.id,
      name: s.name,
      address: s.address ?? s.address ?? null,
      city: s.city ?? null,
      isActive: s.isActive ?? s.is_active ?? true,
      createdAt: s.createdAt ? new Date(s.createdAt) : (s.created_at ? new Date(s.created_at) : new Date()),
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : (s.updated_at ? new Date(s.updated_at) : new Date()),
      adminId: s.adminId ?? s.admin_id ?? '',
      admin: {} as any,
      houses: [] as any,
      monthlyBills: [] as any,
      calcConfigs: [] as any,
      _count: { houses: houseCountMap[s.id] || 0 },
    }))

    return NextResponse.json({ societies })
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

    const { name, address, city } = await request.json()
    if (!name || !name.trim()) return NextResponse.json({ error: 'Society name required' }, { status: 400 })

    const { data, error } = await supabase
      .from('societies')
      .insert({
        name: name.trim(),
        address: address?.trim() || null,
        city: city?.trim() || null,
        admin_id: user.id,
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message || 'Failed to create society')

    const society: Society & { _count?: { houses: number } } = {
      id: data.id,
      name: data.name,
      address: data.address ?? null,
      city: data.city ?? null,
      isActive: !!data.is_active,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
      adminId: data.admin_id,
      admin: {} as any,
      houses: [] as any,
      monthlyBills: [] as any,
      calcConfigs: [] as any,
      _count: { houses: 0 },
    }

    return NextResponse.json({ society })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
