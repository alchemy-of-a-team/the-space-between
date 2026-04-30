import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildPrompt } from '@/lib/artifact'

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { container_id, medium, symbolic_language, coach_synthesis } = body

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isCoach = profile?.role === 'coach' || profile?.role === 'admin'

  // Get entries with author names
  const { data: entries } = await supabase
    .from('entries')
    .select('content, created_at, author:profiles!entries_author_id_fkey(full_name)')
    .eq('container_id', container_id)
    .order('created_at', { ascending: true })

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: 'No entries to generate from' }, { status: 400 })
  }

  // Get reflections (coach only)
  let reflections = null
  if (isCoach) {
    const { data: refs } = await supabase
      .from('reflections')
      .select('what_shifted, what_unnamed, compound_question_now, created_at')
      .eq('container_id', container_id)
      .order('created_at', { ascending: true })
    reflections = refs
  }

  // Build prompt from the modular prompt library
  const prompt = buildPrompt({
    entries: entries.map(e => ({
      author_name: (e.author as unknown as { full_name: string })?.full_name || 'Unknown',
      content: e.content,
      created_at: e.created_at,
    })),
    reflections: reflections || undefined,
    creative_direction: isCoach && medium ? {
      medium,
      symbolic_language: symbolic_language || 'minimalist',
      coach_synthesis: coach_synthesis || '',
    } : undefined,
    isCoach,
  })

  // Generate with Claude
  const message = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content
    .filter(b => b.type === 'text')
    .map(b => b.type === 'text' ? b.text : '')
    .join('')

  // Parse JSON from response
  let artifactContent
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      artifactContent = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found in response')
    }
  } catch {
    artifactContent = {
      artifact_version: '1.0',
      title: 'Untitled',
      medium: medium || 'prose',
      symbolic_language: symbolic_language || 'minimalist',
      coach_synthesis: coach_synthesis || '',
      sections: [{ sequence: 1, week_range: 'Full engagement', visual_header: '', body: responseText, coach_margin_note: null, quotes_used: [], accent_color: null }],
      closing: null,
      metadata: {
        entry_count: entries.length,
        reflection_count: reflections?.length || 0,
        engagement_weeks: 1,
        generated_at: new Date().toISOString(),
        model: 'claude-sonnet-4-20250514',
        prompt_version: '1.0',
      },
    }
  }

  // Store the artifact
  const { data: artifact, error } = await supabase
    .from('artifacts')
    .insert({
      container_id,
      generated_by: user.id,
      medium: medium || 'prose',
      symbolic_language: symbolic_language || 'minimalist',
      coach_synthesis: coach_synthesis || null,
      content: artifactContent,
      narrative: responseText,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(artifact)
}
