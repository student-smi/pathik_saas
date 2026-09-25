import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { signSessionToken } from '@/lib/auth/jwt'
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

    if (error || !data?.session?.user) {
      // Check if user exists in public.users and sync if needed
      const adminClient = createAdminClient()
      const { data: dbUser } = await adminClient
        .from('users')
        .select('id, email, role, isActive')
        .ilike('email', cleanEmail)
        .maybeSingle()

      if (dbUser) {
        const userRole: UserRole = (dbUser.role === 'ADMIN' || cleanEmail.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'
        await adminClient.auth.admin.createUser({
          email: cleanEmail,
          password,
          user_metadata: { role: userRole }
        })

        const retryResult = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })
        data = retryResult.data
        error = retryResult.error
      }
    }

    if (error || !data?.session?.user) {
      return NextResponse.json(
        { error: error?.message || 'Invalid email or password' },
        { status: 401 }
      )
    }

    const sbUser = data.session.user
    const role: UserRole = (sbUser.role === 'ADMIN' || cleanEmail.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

    const appUser = {
      id: sbUser.id,
      email: sbUser.email || cleanEmail,
      role,
      isActive: true,
    }

    const sessionToken = await signSessionToken({
      id: appUser.id,
      email: appUser.email,
      role: appUser.role,
    })

    const response = NextResponse.json({ user: appUser })

    response.cookies.set('auth_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
