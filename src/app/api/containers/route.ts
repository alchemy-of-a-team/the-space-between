import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('containers')
    .select(`
      *,
      coach:profiles!containers_coach_id_fkey(id, full_name),
      client:profiles!containers_client_id_fkey(id, full_name),
      entries(id, created_at),
      invites(email, token, accepted)
    `)
    .order('created_at', { ascending: false })

  if (profile?.role === 'coach' || profile?.role === 'admin') {
    query = query.eq('coach_id', user.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('coach_id', user.id)
    .in('status', ['active', 'trialing'])
    .single()

  if (!subscription) {
    return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
  }

  const body = await request.json()
  const { title, client_email } = body

  const { data: container, error } = await supabase
    .from('containers')
    .insert({
      coach_id: user.id,
      title: title || null,
      status: 'invited',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create invite if client email provided
  if (client_email) {
    await supabase.from('invites').insert({
      container_id: container.id,
      email: client_email,
    })
  }

  return NextResponse.json(container)
}
