import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionToken } from '../auth/jwt'

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const token = request.cookies.get('auth_session')?.value
  let user: any = null

  if (token) {
    const session = await verifySessionToken(token)
    if (session) {
      user = {
        id: session.id,
        email: session.email,
        app_metadata: { role: session.role },
        user_metadata: { role: session.role },
      }
    }
  }

  return { supabaseResponse, user }
}
