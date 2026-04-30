import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('invites')
    .select('email, container_id, accepted')
    .eq('token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
  }

  // Don't expose email or container_id to unauthenticated callers
  return NextResponse.json({ valid: true, accepted: data.accepted })
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Get authenticated user from session
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Must be signed in to accept invite' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .select('container_id, accepted')
    .eq('token', token)
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
  }

  if (invite.accepted) {
    return NextResponse.json({ error: 'Already accepted' }, { status: 400 })
  }

  // Update invite
  await supabase
    .from('invites')
    .update({ accepted: true })
    .eq('token', token)

  // Assign authenticated user as client on container
  await supabase
    .from('containers')
    .update({ client_id: user.id, status: 'active' })
    .eq('id', invite.container_id)

  return NextResponse.json({ success: true, container_id: invite.container_id })
}
