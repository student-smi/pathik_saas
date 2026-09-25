import { createD1Client } from '../d1/adapter'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createD1Client(cookieStore)
}

export function createAdminClient() {
  return createD1Client()
}
