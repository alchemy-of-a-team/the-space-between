import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildPrompt } from '@/lib/artifact'

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

async function generateImage(prompt: string, style: string): Promise<Buffer | null> {
  console.log('[image] generateImage called, key present:', !!process.env.OPENAI_API_KEY)
  try {
    // Wrap the visual header in an abstract art direction to avoid safety filters.
    // The visual headers describe scenes metaphorically; we keep the imagery
    // but frame it as fine art illustration with no real people.
    const artPrompt = `Create a fine art illustration in ${style} style. No text, no words, no letters. No photorealistic human faces. Abstract or symbolic figures only. The scene: ${prompt}`

    console.log('[image] Calling DALL-E...')
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: artPrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      }),
    })
    console.log('[image] DALL-E responded:', res.status)
    if (!res.ok) {
      const errText = await res.text()
      console.log('[image] DALL-E error:', errText)
      // Retry with ultra-simple prompt on safety rejection
      if (errText.includes('safety')) {
        console.log('[image] Retrying with simplified prompt...')
        const retryRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: `Abstract ${style} fine art painting. Symbolic, evocative, no text, no faces. Moody atmospheric scene suggesting transformation and inner change.`,
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json',
          }),
        })
        if (retryRes.ok) {
          const retryJson = await retryRes.json()
          const b64 = retryJson.data?.[0]?.b64_json
          if (b64) return Buffer.from(b64, 'base64')
        }
      }
      return null
    }
    const json = await res.json()
    const b64 = json.data?.[0]?.b64_json
    if (!b64) return null
    return Buffer.from(b64, 'base64')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.log('[image] generation exception:', msg)
    return null
  }
}

async function uploadImage(supabase: Awaited<ReturnType<typeof createServiceClient>>, artifactId: string, sectionIndex: number, imageBuffer: Buffer): Promise<string | null> {
  const path = `${artifactId}/section-${sectionIndex}.png`
  const { error } = await supabase.storage
    .from('artifact-images')
    .upload(path, imageBuffer, { contentType: 'image/png', upsert: true })

  if (error) {
    console.log('[image] upload error:', error.message)
    return null
  }

  const { data } = supabase.storage.from('artifact-images').getPublicUrl(path)
  return data.publicUrl
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
      sections: [{ sequence: 1, week_range: 'Full engagement', visual_header: '', body: responseText, coach_margin_note: null, quotes_used: [], accent_color: null, image_url: null }],
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

  // Store artifact first to get the ID
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

  // Generate images for each section in parallel
  const serviceClient = await createServiceClient()
  const imageStyle = `${symbolic_language || 'minimalist'}, ${medium || 'artistic illustration'}`
  console.log(`[artifact] Generating images for ${artifactContent.sections?.length || 0} sections, style: ${imageStyle}`)

  // Generate images sequentially to avoid DALL-E rate limits
  const imageUrls: (string | null)[] = []
  for (let i = 0; i < (artifactContent.sections || []).length; i++) {
    const section = artifactContent.sections[i]
    console.log(`[artifact] Section ${i}: visual_header=${section.visual_header ? 'yes (' + section.visual_header.substring(0, 50) + '...)' : 'NONE'}`)
    if (!section.visual_header) {
      imageUrls.push(null)
      continue
    }
    const imageBuffer = await generateImage(section.visual_header, imageStyle)
    if (!imageBuffer) {
      console.log(`[image] Section ${i}: no image generated`)
      imageUrls.push(null)
      continue
    }
    console.log(`[image] Section ${i}: got image, ${imageBuffer.length} bytes, uploading...`)
    const url = await uploadImage(serviceClient, artifact.id, i, imageBuffer)
    console.log(`[image] Section ${i}: uploaded, url=${url ? 'yes' : 'FAILED'}`)
    imageUrls.push(url)
  }

  // Update sections with image URLs
  let hasImages = false
  for (let i = 0; i < (artifactContent.sections || []).length; i++) {
    if (imageUrls[i]) {
      artifactContent.sections[i].image_url = imageUrls[i]
      hasImages = true
    }
  }

  // Update artifact with image URLs using service client (bypasses RLS)
  if (hasImages) {
    const { error: updateError } = await serviceClient
      .from('artifacts')
      .update({ content: artifactContent })
      .eq('id', artifact.id)
    if (updateError) console.log('[artifact] Failed to update with images:', updateError.message)
    else console.log('[artifact] Updated artifact with', imageUrls.filter(Boolean).length, 'images')
  }

  return NextResponse.json({ ...artifact, content: artifactContent })
}
