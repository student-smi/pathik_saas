import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { data: houseCheck } = await supabase
      .from('houses')
      .select('id, society_id, residents:residents(id)')
      .eq('id', id)
      .maybeSingle()

    if (!houseCheck) return NextResponse.json({ error: 'House not found' }, { status: 404 })
    if (houseCheck.residents && houseCheck.residents.length > 0) {
      return NextResponse.json({ error: 'Cannot delete house with resident assigned' }, { status: 400 })
    }

    const { error } = await supabase
      .from('houses')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
