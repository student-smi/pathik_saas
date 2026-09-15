import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: sbUser } } = await supabase.auth.getUser()

    if (!sbUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const role: UserRole = (((sbUser.app_metadata as any)?.role) === 'ADMIN' ||
      ((sbUser.user_metadata as any)?.role) === 'ADMIN' ||
      sbUser.email?.startsWith('admin'))
      ? 'ADMIN'
      : 'RESIDENT'

    let appUser = {
      id: sbUser.id,
      email: sbUser.email,
      role,
      isActive: true,
    }

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, role, isActive')
        .eq('id', sbUser.id)
        .maybeSingle()

      if (userData) {
        appUser = {
          id: userData.id,
          email: userData.email,
          role: (userData.role === 'ADMIN' ? 'ADMIN' : 'RESIDENT') as UserRole,
          isActive: !!userData.isActive,
        }
      }
    } catch {
    }

    return NextResponse.json({ user: appUser })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
