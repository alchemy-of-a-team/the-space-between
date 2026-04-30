import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

function buildPrompt(params: {
  entries: { author_name: string; content: string; created_at: string }[]
  reflections?: { what_shifted: string | null; what_unnamed: string | null; compound_question_now: string | null; created_at: string }[]
  medium?: string
  symbolic_language?: string
  coach_synthesis?: string
  isCoach: boolean
}) {
  const { entries, reflections, medium, symbolic_language, coach_synthesis, isCoach } = params

  const entryCount = entries.length
  const weeks = Math.ceil(
    (new Date(entries[entries.length - 1]?.created_at || Date.now()).getTime() -
      new Date(entries[0]?.created_at || Date.now()).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  ) || 1

  const sharedEntries = entries
    .map(e => `[${new Date(e.created_at).toLocaleDateString()}] ${e.author_name}:\n${e.content}`)
    .join('\n\n')

  const scaleNote = entryCount <= 8
    ? `There are ${entryCount} entries spanning ${weeks} weeks. Scale the artifact to the data available. Do not pad or invent additional movements.`
    : `There are ${entryCount} entries spanning ${weeks} weeks. Group entries by arc movement (what shifted), not by week. Select the most significant shifts. The artifact should have no more than 10 sections regardless of entry count.`

  // Medium-specific output format instructions
  const outputFormats: Record<string, string> = {
    'prose': `Render a prose piece in the coach's voice. Each section has a one-sentence visual header (a scene that an illustrator would render) followed by the coach's interpretive prose. The piece should read as a complete, standalone essay. 4-8 sections, 150-250 words per section. ${scaleNote}`,
    'comic strip': `Render a ${Math.min(Math.max(entryCount, 4), 8)}-panel comic strip. Each panel: a visual description (what the scene looks like), a caption or dialogue line from the entries, and an optional coach margin note (raw, handwritten, private). Specify the accent color for each panel. The strip should read as a complete visual story. ${scaleNote}`,
    'illustrated timeline': `Render a timeline with ${Math.min(Math.max(entryCount, 4), 10)} nodes. Each node: a date/week label, a visual symbol or scene description, a key quote, and a coach annotation. Major shifts get larger nodes. The timeline should show the arc's progression. ${scaleNote}`,
    'infographic': `Render an infographic organized by arc movement (not chronology). Each section: a visual metaphor, key quotes as evidence, and the coach's interpretive callout. The infographic should make the arc visible at a glance. ${scaleNote}`,
  }

  if (!isCoach) {
    // Client-triggered: lesser version, no reflections or creative direction
    return `You are rendering an emergence artifact for a coaching engagement. This is a personal visualization of the client's journey, rendered from the shared entries.

## Rules

1. Every element must be SPECIFIC to this client. If you could swap in a different client's name and the element still works, it's too generic. Rewrite.
2. Do not explain the arc. Render it. The reader should feel the movement, not be told about it.
3. Dialogue and quotes are pulled from the actual entries. Do not invent language.
4. Scale the artifact structure to the data.

## Source material

### Shared entries (chronological)
${sharedEntries}

## Output format
Render a prose piece reflecting the arc visible in these entries. Each section has a one-sentence visual header followed by interpretive prose. 4-6 sections, 150-200 words per section. ${scaleNote}

## Output structure
Return your response as valid JSON with this structure:
{
  "artifact_version": "1.0",
  "title": "string",
  "medium": "prose",
  "symbolic_language": "minimalist",
  "coach_synthesis": "",
  "sections": [
    {
      "sequence": 1,
      "week_range": "string",
      "visual_header": "string",
      "body": "string",
      "coach_margin_note": null,
      "quotes_used": ["string"],
      "accent_color": null
    }
  ],
  "closing": "string or null",
  "metadata": {
    "entry_count": ${entryCount},
    "reflection_count": 0,
    "engagement_weeks": ${weeks},
    "generated_at": "${new Date().toISOString()}",
    "model": "claude-sonnet-4-20250514",
    "prompt_version": "1.0"
  }
}`
  }

  const coachReflections = reflections
    ?.map(r => {
      const parts = []
      if (r.what_shifted) parts.push(`What shifted: ${r.what_shifted}`)
      if (r.what_unnamed) parts.push(`What unnamed: ${r.what_unnamed}`)
      if (r.compound_question_now) parts.push(`Compound question now: ${r.compound_question_now}`)
      return `[${new Date(r.created_at).toLocaleDateString()}]\n${parts.join('\n')}`
    })
    .join('\n\n') || ''

  const mediumKey = (medium || 'prose').toLowerCase()
  const outputFormat = outputFormats[mediumKey] || outputFormats['prose']

  const symbolicName = symbolic_language || 'minimalist'
  const mediumDesc = medium || 'prose'

  return `You are rendering an emergence artifact for a coaching engagement. This is a personal visualization of the client's transformation arc, rendered from the coach's point of view.

This is NOT a summary. NOT a dashboard. NOT a progress report. It is a rendering of transformation that the client could show their partner, their next coach, or the version of themselves who comes back to it in three years. The bar: does it produce recognition?

## Rules

1. Every element must be SPECIFIC to this client. If you could swap in a different client's name and the element still works, it's too generic. Rewrite.
2. The symbolic language is STRUCTURAL, not decorative. ${symbolicName} must carry the arc's meaning. If removing the symbol or metaphor changes nothing, it isn't doing work. Remove it and replace with one that does.
3. The coach's voice is the interpretive layer. The client's words appear as evidence. The coach's reading of what happened -- including what the client hasn't named yet -- is what makes this artifact more than a summary.
4. Do not explain the arc. Render it. The reader should feel the movement, not be told about it.
5. Dialogue and quotes are pulled from the actual entries. Do not invent language that sounds like coaching brochure copy.
6. Scale the artifact structure to the data. If there are 3 entries, do not generate 6 sections. The number of movements in the artifact equals the number of real shifts in the source material.
7. If there are more than 12 entries, group them by arc movement (what shifted), not by chronology. The artifact follows the arc, not the calendar.

## Medium
${mediumDesc}

## Symbolic language
${symbolicName}

## Coach's final synthesis
${coach_synthesis || '(No synthesis provided)'}

## Source material

### Shared entries (chronological)
${sharedEntries}

### Coach reflections (private, accumulated)
${coachReflections}

## Output format
${outputFormat}

## Output structure
Return your response as valid JSON with this structure:
{
  "artifact_version": "1.0",
  "title": "string -- the artifact's title",
  "medium": "${mediumDesc}",
  "symbolic_language": "${symbolicName}",
  "coach_synthesis": "${(coach_synthesis || '').replace(/"/g, '\\"').replace(/\n/g, '\\n')}",
  "sections": [
    {
      "sequence": 1,
      "week_range": "string -- e.g., 'Week 1' or 'Weeks 1-2'",
      "visual_header": "string -- one-sentence scene description",
      "body": "string -- the rendered content for this section",
      "coach_margin_note": "string or null -- raw coach annotation if the medium uses them",
      "quotes_used": ["string -- actual quotes from entries"],
      "accent_color": "string or null -- hex color for this section"
    }
  ],
  "closing": "string or null -- final paragraph if distinct from last section",
  "metadata": {
    "entry_count": ${entryCount},
    "reflection_count": ${reflections?.length || 0},
    "engagement_weeks": ${weeks},
    "generated_at": "${new Date().toISOString()}",
    "model": "claude-sonnet-4-20250514",
    "prompt_version": "1.0"
  }
}`
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

  const prompt = buildPrompt({
    entries: entries.map(e => ({
      author_name: (e.author as unknown as { full_name: string })?.full_name || 'Unknown',
      content: e.content,
      created_at: e.created_at,
    })),
    reflections: reflections || undefined,
    medium,
    symbolic_language,
    coach_synthesis,
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
    // Try to find JSON in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      artifactContent = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found in response')
    }
  } catch {
    // If parsing fails, wrap the narrative text
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
