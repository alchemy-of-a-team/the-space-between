import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const containerId = searchParams.get('container_id')
  if (!containerId) return NextResponse.json({ error: 'container_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('container_id', containerId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { container_id, what_shifted, what_unnamed, compound_question_now } = body

  const { data, error } = await supabase
    .from('reflections')
    .insert({
      container_id,
      coach_id: user.id,
      what_shifted: what_shifted || null,
      what_unnamed: what_unnamed || null,
      compound_question_now: compound_question_now || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
