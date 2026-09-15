import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const supabase = await createClient()

    let { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    // If client login fails, check if user exists in public.users and sync to auth.users if needed
    if (error || !data.session?.user) {
      const adminClient = createAdminClient()
      const { data: dbUser } = await adminClient
        .from('users')
        .select('id, email, role, isActive')
        .ilike('email', cleanEmail)
        .maybeSingle()

      if (dbUser) {
        const userRole: UserRole = (dbUser.role === 'ADMIN' || cleanEmail.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

        // Check if user exists in Supabase Auth
        const { data: authList } = await adminClient.auth.admin.listUsers()
        const existingAuthUser = authList?.users?.find(u => u.email?.toLowerCase() === cleanEmail)

        if (!existingAuthUser) {
          // Create in auth.users
          await adminClient.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: true,
            user_metadata: { role: userRole },
            app_metadata: { role: userRole },
          })
        } else {
          // Update password in auth.users
          await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
            password,
            user_metadata: { role: userRole },
            app_metadata: { role: userRole },
          })
        }

        // Retry login
        const retryResult = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })
        data = retryResult.data
        error = retryResult.error
      }
    }

    if (error || !data.session?.user) {
      return NextResponse.json(
        { error: error?.message || 'Invalid email or password' },
        { status: 401 }
      )
    }

    const sbUser = data.session.user
    const role: UserRole = (((sbUser.app_metadata as any)?.role) === 'ADMIN' ||
      ((sbUser.user_metadata as any)?.role) === 'ADMIN' ||
      sbUser.email?.startsWith('admin'))
      ? 'ADMIN'
      : 'RESIDENT'

    let appUser = {
      id: sbUser.id,
      email: sbUser.email || cleanEmail,
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
          email: userData.email || cleanEmail,
          role: (userData.role === 'ADMIN' ? 'ADMIN' : 'RESIDENT') as UserRole,
          isActive: userData.isActive !== undefined ? !!userData.isActive : true,
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
