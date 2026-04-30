import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SharedSpaceClient } from './shared-space-client'

export default async function ContainerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: container } = await supabase
    .from('containers')
    .select(`
      *,
      coach:profiles!containers_coach_id_fkey(id, full_name),
      client:profiles!containers_client_id_fkey(id, full_name)
    `)
    .eq('id', id)
    .single()

  if (!container) redirect('/dashboard')

  return <SharedSpaceClient container={container} profile={profile} />
}
