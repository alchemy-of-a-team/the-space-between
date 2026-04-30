/**
 * Artifact prompt builder.
 *
 * This is the file you edit when you want to change how artifacts are generated.
 * It is the ONLY file that contains prompt text. The API route, renderer,
 * and UI are all separate.
 *
 * Architecture:
 *   prompt.ts     -- prompt template (this file, the creative brain)
 *   format.ts     -- data formatting (entries/reflections -> text blocks)
 *   output-schema.ts -- JSON schema instruction (contract with renderer)
 *   types.ts      -- input type definitions
 *
 * The prompt receives structured data and returns a string.
 * The API route handles data fetching and storage.
 * The renderer handles display.
 */

import type { BuildPromptParams } from './types'
import { formatEntries, formatReflections, computeEngagementWeeks, scaleNote } from './format'
import { outputSchemaInstruction } from './output-schema'

// ---------------------------------------------------------------------------
// Medium-specific output format instructions.
// Add new mediums here. The key is matched case-insensitively against
// the medium string from creative direction. Unknown mediums fall through
// to the default (prose).
// ---------------------------------------------------------------------------
function outputFormatForMedium(medium: string, entryCount: number, scale: string): string {
  const key = medium.toLowerCase()

  if (key.includes('comic')) {
    const panels = Math.min(Math.max(entryCount, 4), 8)
    return `Render a ${panels}-panel comic strip. Each panel: a visual description (what the scene looks like), a caption or dialogue line from the entries, and an optional coach margin note (raw, handwritten, private). Specify the accent color for each panel. The strip should read as a complete visual story. ${scale}`
  }

  if (key.includes('timeline')) {
    const nodes = Math.min(Math.max(entryCount, 4), 10)
    return `Render a timeline with ${nodes} nodes. Each node: a date/week label, a visual symbol or scene description, a key quote, and a coach annotation. Major shifts get larger nodes. The timeline should show the arc's progression. ${scale}`
  }

  if (key.includes('infographic')) {
    return `Render an infographic organized by arc movement (not chronology). Each section: a visual metaphor, key quotes as evidence, and the coach's interpretive callout. The infographic should make the arc visible at a glance. ${scale}`
  }

  // Default: prose. Also catches any freeform medium the coach types.
  return `Render a prose piece in the coach's voice. Each section has a one-sentence visual header (a scene that an illustrator would render) followed by the coach's interpretive prose. The piece should read as a complete, standalone essay. 4-8 sections, 150-250 words per section. ${scale}`
}

// ---------------------------------------------------------------------------
// Client-triggered prompt (lesser version, no reflections or creative direction)
// ---------------------------------------------------------------------------
function buildClientPrompt(params: {
  sharedEntries: string
  entryCount: number
  weeks: number
  scale: string
}): string {
  const { sharedEntries, entryCount, weeks, scale } = params

  const schema = outputSchemaInstruction({
    medium: 'prose',
    symbolic_language: 'minimalist',
    coach_synthesis: '',
    entry_count: entryCount,
    reflection_count: 0,
    weeks,
  })

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
Render a prose piece reflecting the arc visible in these entries. Each section has a one-sentence visual header followed by interpretive prose. 4-6 sections, 150-200 words per section. ${scale}

${schema}`
}

// ---------------------------------------------------------------------------
// Coach-triggered prompt (full version with reflections + creative direction)
// ---------------------------------------------------------------------------
function buildCoachPrompt(params: {
  sharedEntries: string
  coachReflections: string
  medium: string
  symbolicLanguage: string
  coachSynthesis: string
  entryCount: number
  reflectionCount: number
  weeks: number
  scale: string
}): string {
  const {
    sharedEntries, coachReflections, medium, symbolicLanguage,
    coachSynthesis, entryCount, reflectionCount, weeks, scale,
  } = params

  const outputFormat = outputFormatForMedium(medium, entryCount, scale)

  const schema = outputSchemaInstruction({
    medium,
    symbolic_language: symbolicLanguage,
    coach_synthesis: coachSynthesis,
    entry_count: entryCount,
    reflection_count: reflectionCount,
    weeks,
  })

  return `You are rendering an emergence artifact for a coaching engagement. This is a personal visualization of the client's transformation arc, rendered from the coach's point of view.

This is NOT a summary. NOT a dashboard. NOT a progress report. It is a rendering of transformation that the client could show their partner, their next coach, or the version of themselves who comes back to it in three years. The bar: does it produce recognition?

## Rules

1. Every element must be SPECIFIC to this client. If you could swap in a different client's name and the element still works, it's too generic. Rewrite.
2. The symbolic language is STRUCTURAL, not decorative. ${symbolicLanguage} must carry the arc's meaning. If removing the symbol or metaphor changes nothing, it isn't doing work. Remove it and replace with one that does.
3. The coach's voice is the interpretive layer. The client's words appear as evidence. The coach's reading of what happened -- including what the client hasn't named yet -- is what makes this artifact more than a summary.
4. Do not explain the arc. Render it. The reader should feel the movement, not be told about it.
5. Dialogue and quotes are pulled from the actual entries. Do not invent language that sounds like coaching brochure copy.
6. Scale the artifact structure to the data. If there are 3 entries, do not generate 6 sections. The number of movements in the artifact equals the number of real shifts in the source material.
7. If there are more than 12 entries, group them by arc movement (what shifted), not by chronology. The artifact follows the arc, not the calendar.

## Medium
${medium}

## Symbolic language
${symbolicLanguage}

## Coach's final synthesis
${coachSynthesis || '(No synthesis provided)'}

## Source material

### Shared entries (chronological)
${sharedEntries}

### Coach reflections (private, accumulated)
${coachReflections}

## Output format
${outputFormat}

${schema}`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function buildPrompt(params: BuildPromptParams): string {
  const { entries, reflections, creative_direction, isCoach } = params

  const entryCount = entries.length
  const weeks = computeEngagementWeeks(entries)
  const sharedEntries = formatEntries(entries)
  const scale = scaleNote(entryCount, weeks)

  if (!isCoach || !creative_direction) {
    return buildClientPrompt({ sharedEntries, entryCount, weeks, scale })
  }

  return buildCoachPrompt({
    sharedEntries,
    coachReflections: formatReflections(reflections || []),
    medium: creative_direction.medium,
    symbolicLanguage: creative_direction.symbolic_language,
    coachSynthesis: creative_direction.coach_synthesis,
    entryCount,
    reflectionCount: reflections?.length || 0,
    weeks,
    scale,
  })
}
