import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  const isLoginPage = pathname.startsWith('/login')
  const isAdminRoute = pathname.startsWith('/admin')
  const isResidentRoute = pathname.startsWith('/resident')
  const isPublicRoute = isLoginPage || pathname === '/' || pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    const rawRole = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role
    const role = (rawRole === 'ADMIN' || user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'
    url.pathname = role === 'ADMIN' ? '/admin' : '/resident'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
  ],
}

export default proxy

