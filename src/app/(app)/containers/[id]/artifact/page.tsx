import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArtifactViewClient } from './artifact-view-client'

export default async function ArtifactPage({
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

  return <ArtifactViewClient containerId={id} profile={profile} />
}
