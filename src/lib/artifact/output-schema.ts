/**
 * The JSON output schema that Claude must return.
 * This is the contract between the prompt and the renderer.
 *
 * If you change this schema, update three things:
 * 1. This file (the schema instruction sent to Claude)
 * 2. src/lib/types.ts (the TypeScript types)
 * 3. src/components/artifact-renderer.tsx (the renderer)
 */

export function outputSchemaInstruction(params: {
  medium: string
  symbolic_language: string
  coach_synthesis: string
  entry_count: number
  reflection_count: number
  weeks: number
}): string {
  const { medium, symbolic_language, coach_synthesis, entry_count, reflection_count, weeks } = params

  return `## Output structure
Return your response as valid JSON with this structure:
{
  "artifact_version": "1.0",
  "title": "string -- the artifact's title",
  "medium": "${medium}",
  "symbolic_language": "${symbolic_language}",
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
    "entry_count": ${entry_count},
    "reflection_count": ${reflection_count},
    "engagement_weeks": ${weeks},
    "generated_at": "${new Date().toISOString()}",
    "model": "claude-sonnet-4-20250514",
    "prompt_version": "1.0"
  }
}`
}
