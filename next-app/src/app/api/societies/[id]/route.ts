import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Society } from '@/types'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = ((user.app_metadata as any)?.role === 'ADMIN' ||
      (user.user_metadata as any)?.role === 'ADMIN' ||
      user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const payload: any = {}
    if (body.name !== undefined) payload.name = body.name.trim()
    if (body.address !== undefined) payload.address = body.address?.trim() || null
    if (body.city !== undefined) payload.city = body.city?.trim() || null

    if (!payload.name || payload.name === '') {
      return NextResponse.json({ error: 'Society name cannot be empty' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('societies')
      .update(payload)
      .eq('id', id)
      .eq('admin_id', user.id)
      .select()
      .single()

    if (error || !data) throw new Error(error?.message || 'Update failed')

    const society: Society = {
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
    }

    return NextResponse.json({ society })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
