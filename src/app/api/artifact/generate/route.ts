import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { fal } from '@fal-ai/client'
import { buildPrompt } from '@/lib/artifact'

export const maxDuration = 300

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

// Configure fal.ai client
fal.config({ credentials: process.env.FAL_KEY })

/**
 * Map the text medium to a visual art direction for image generation.
 * The medium (comic strip, prose, timeline) implies a visual style.
 * The symbolic language is handled by Claude in the visual_header text.
 */
function artDirectionForMedium(medium: string): string {
  const key = medium.toLowerCase()
  if (key.includes('comic')) return 'Graphic novel panel, single scene, bold ink lines, limited color palette, dramatic lighting.'
  if (key.includes('timeline')) return 'Editorial illustration, single scene, clean composition, muted earth tones, atmospheric.'
  if (key.includes('infographic')) return 'Stylized icon illustration, flat design, geometric shapes, cohesive color system.'
  // Default (prose): painterly illustration
  return 'Painterly illustration, single scene, expressive brushwork, atmospheric lighting, muted palette.'
}

/**
 * Generate an image using Flux Kontext Pro via fal.ai.
 * If a referenceUrl is provided, Kontext uses it as a style reference
 * so all images in the artifact share a consistent visual identity.
 */
async function generateImage(
  prompt: string,
  medium: string,
  referenceUrl?: string
): Promise<string | null> {
  try {
    const artDirection = artDirectionForMedium(medium)
    const artPrompt = `${artDirection} No text, no words, no lettering. ${prompt}`

    if (referenceUrl) {
      // Use Kontext for style-consistent follow-up images
      const result = await fal.subscribe('fal-ai/flux-pro/kontext', {
        input: {
          prompt: artPrompt,
          image_url: referenceUrl,
          num_images: 1,
          output_format: 'png',
        },
      })
      return (result.data as { images?: { url: string }[] })?.images?.[0]?.url ?? null
    }

    // Hero image: use Flux 2 Pro for highest quality first image
    const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt: artPrompt,
        num_images: 1,
        image_size: 'square_hd',
        output_format: 'png',
      },
    })
    return (result.data as { images?: { url: string }[] })?.images?.[0]?.url ?? null
  } catch (err) {
    console.error('[image] generation error:', err)
    return null
  }
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB

function isAllowedImageHost(hostname: string): boolean {
  return hostname === 'storage.googleapis.com'
    || hostname === 'fal.run'
    || hostname.endsWith('.fal.media')
    || hostname === 'fal.media'
}

async function fetchImageSafely(url: string): Promise<Buffer | null> {
  const parsed = new URL(url)
  if (!isAllowedImageHost(parsed.hostname)) {
    console.error('[image] blocked fetch to unexpected host:', parsed.hostname)
    return null
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) return null

  const contentLength = res.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > MAX_IMAGE_BYTES) {
    console.error('[image] response too large:', contentLength)
    return null
  }

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_IMAGE_BYTES) {
    console.error('[image] buffer too large:', buf.length)
    return null
  }
  return buf
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

  // Validate container_id
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!container_id || !uuidRe.test(container_id)) {
    return NextResponse.json({ error: 'Invalid container_id' }, { status: 400 })
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
  }

  const isCoach = profile.role === 'coach' || profile.role === 'admin'

  // Verify user has access to this container (RLS enforces this, but check before burning API credits)
  const { data: container } = await supabase
    .from('containers')
    .select('id')
    .eq('id', container_id)
    .single()

  if (!container) {
    return NextResponse.json({ error: 'Container not found or access denied' }, { status: 404 })
  }

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
    model: 'claude-opus-4-20250514',
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
        model: 'claude-opus-4-20250514',
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

  // Generate images: hero image first, then style-consistent follow-ups via Kontext
  const serviceClient = await createServiceClient()
  const artifactMedium = medium || 'prose'
  const imageUrls: (string | null)[] = []
  let heroUrl: string | null = null

  for (let i = 0; i < (artifactContent.sections || []).length; i++) {
    const section = artifactContent.sections[i]
    if (!section.visual_header) {
      imageUrls.push(null)
      continue
    }

    // First image with a visual_header becomes the hero (no reference).
    // Subsequent images use the hero as a style reference via Kontext.
    const falUrl = await generateImage(section.visual_header, artifactMedium, heroUrl ?? undefined)
    if (!falUrl) {
      imageUrls.push(null)
      continue
    }

    // Set hero reference for subsequent images
    if (!heroUrl) heroUrl = falUrl

    // Download from fal (with domain allowlist + size cap) and upload to Supabase storage
    const imageBuffer = await fetchImageSafely(falUrl)
    if (!imageBuffer) {
      imageUrls.push(null)
      continue
    }
    const url = await uploadImage(serviceClient, artifact.id, i, imageBuffer)
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
    if (updateError) {
      console.error('[artifact] failed to update with image URLs:', updateError.message)
    }
  }

  return NextResponse.json({ ...artifact, content: artifactContent })
}
