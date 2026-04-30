import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  console.log('[dashboard] getUser:', user?.id || 'none', 'error:', authError?.message || 'none')

  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log('[dashboard] profile:', profile?.full_name || 'none', 'error:', profileError?.message || 'none')

  if (!profile) {
    // Don't redirect on profile error -- create a fallback profile
    return <DashboardClient profile={{ id: user.id, full_name: user.email || 'Coach', role: 'coach', created_at: '' }} />
  }

  return <DashboardClient profile={profile} />
}
