import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GenerateArtifactClient } from './generate-client'

export default async function GenerateArtifactPage({
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

  // Get last artifact for pre-populating medium/language
  const { data: lastArtifact } = await supabase
    .from('artifacts')
    .select('medium, symbolic_language')
    .eq('container_id', id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <GenerateArtifactClient
      containerId={id}
      profile={profile}
      lastMedium={lastArtifact?.medium || ''}
      lastLanguage={lastArtifact?.symbolic_language || ''}
    />
  )
}
