import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role = ((user.app_metadata as any)?.role) ||
    ((user.user_metadata as any)?.role) ||
    (user.email?.startsWith('admin') ? 'ADMIN' : 'RESIDENT')

  redirect(role === 'ADMIN' ? '/admin' : '/resident')
  return null
}
