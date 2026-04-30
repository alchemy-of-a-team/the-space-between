import { createServiceClient } from '@/lib/supabase/server'
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

  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
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

  const body = await request.json()
  const { user_id } = body

  // Update invite
  await supabase
    .from('invites')
    .update({ accepted: true })
    .eq('token', token)

  // Assign client to container and activate
  await supabase
    .from('containers')
    .update({ client_id: user_id, status: 'active' })
    .eq('id', invite.container_id)

  return NextResponse.json({ success: true, container_id: invite.container_id })
}
