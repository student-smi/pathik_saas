import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
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

    const { data: resident } = await supabase
      .from('residents')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle()

    if (!resident) return NextResponse.json({ error: 'Resident not found' }, { status: 404 })

    const { error } = await supabase.from('residents').delete().eq('id', id)
    if (error) throw error

    if (resident.user_id) {
      try {
        const admin = createAdminClient()
        await admin.auth.admin.deleteUser(resident.user_id)
      } catch {}
      try {
        await supabase.from('users').delete().eq('id', resident.user_id)
      } catch {}
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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

    const { password } = await request.json()
    if (!password || !password.trim()) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    const { data: resident } = await supabase
      .from('residents')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle()

    if (!resident) return NextResponse.json({ error: 'Resident not found' }, { status: 404 })

    if (resident.user_id) {
      const admin = createAdminClient()
      const { error: updateErr } = await admin.auth.admin.updateUserById(
        resident.user_id,
        { password: password.trim() }
      )
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
