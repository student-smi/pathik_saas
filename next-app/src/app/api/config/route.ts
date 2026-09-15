import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CalcConfig, Society } from '@/types'

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
      .from('calc_configs')
      .select('*')

    if (error) {
      console.error('Calc config fetch error:', error)
      throw error
    }

    const filtered = (rawData as any[] || []).filter(c => (c.societyId || c.society_id) === societyId)

    const configs: CalcConfig[] = filtered.map(c => ({
      id: c.id,
      societyId: c.societyId || c.society_id || '',
      society: {} as Society,
      fieldName: c.fieldName || c.field_name || '',
      formula: c.formula || '',
      description: c.description ?? null,
      isActive: c.isActive !== undefined ? !!c.isActive : !!c.is_active,
      createdAt: c.createdAt ? new Date(c.createdAt) : (c.created_at ? new Date(c.created_at) : new Date()),
      updatedAt: c.updatedAt ? new Date(c.updatedAt) : (c.updated_at ? new Date(c.updated_at) : new Date()),
    }))

    return NextResponse.json({ configs })
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

    const { societyId, fieldName, formula, description, isActive } = await request.json()
    if (!societyId || !fieldName || !fieldName.trim()) {
      return NextResponse.json({ error: 'societyId and fieldName required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('calc_configs')
      .insert({
        society_id: societyId,
        field_name: fieldName.trim().toUpperCase(),
        formula: formula || '',
        description: description?.trim() || null,
        is_active: isActive !== false,
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message || 'Failed to create config')

    const config: CalcConfig = {
      id: data.id,
      societyId: data.society_id,
      society: {} as any,
      fieldName: data.field_name,
      formula: data.formula || '',
      description: data.description ?? null,
      isActive: !!data.is_active,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
    }

    return NextResponse.json({ config })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = ((user.app_metadata as any)?.role === 'ADMIN' ||
      (user.user_metadata as any)?.role === 'ADMIN' ||
      user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { id, societyId } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const payload: any = {}
    if ('formula' in body) payload.formula = body.formula || ''
    if ('description' in body) payload.description = body.description?.trim() || null
    if ('isActive' in body) payload.is_active = !!body.isActive
    if ('fieldName' in body) payload.field_name = body.fieldName.trim().toUpperCase()

    const { data, error } = await supabase
      .from('calc_configs')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) throw new Error(error?.message || 'Update failed')

    const config: CalcConfig = {
      id: data.id,
      societyId: data.society_id,
      society: {} as any,
      fieldName: data.field_name,
      formula: data.formula || '',
      description: data.description ?? null,
      isActive: !!data.is_active,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
    }

    return NextResponse.json({ config })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = ((user.app_metadata as any)?.role === 'ADMIN' ||
      (user.user_metadata as any)?.role === 'ADMIN' ||
      user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase.from('calc_configs').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
