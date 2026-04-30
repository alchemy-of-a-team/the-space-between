/**
 * Data formatting helpers for artifact prompt construction.
 * These transform raw data into the text blocks that get
 * interpolated into the prompt template.
 */

import type { ArtifactEntry, ArtifactReflection } from './types'

export function formatEntries(entries: ArtifactEntry[]): string {
  return entries
    .map(e => `[${new Date(e.created_at).toLocaleDateString()}] ${e.author_name}:\n${e.content}`)
    .join('\n\n')
}

export function formatReflections(reflections: ArtifactReflection[]): string {
  return reflections
    .map(r => {
      const parts = []
      if (r.what_shifted) parts.push(`What shifted: ${r.what_shifted}`)
      if (r.what_unnamed) parts.push(`What unnamed: ${r.what_unnamed}`)
      if (r.compound_question_now) parts.push(`Compound question now: ${r.compound_question_now}`)
      return `[${new Date(r.created_at).toLocaleDateString()}]\n${parts.join('\n')}`
    })
    .join('\n\n')
}

export function computeEngagementWeeks(entries: ArtifactEntry[]): number {
  if (entries.length < 2) return 1
  const first = new Date(entries[0].created_at).getTime()
  const last = new Date(entries[entries.length - 1].created_at).getTime()
  return Math.ceil((last - first) / (7 * 24 * 60 * 60 * 1000)) || 1
}

export function scaleNote(entryCount: number, weeks: number): string {
  if (entryCount <= 8) {
    return `There are ${entryCount} entries spanning ${weeks} weeks. Scale the artifact to the data available. Do not pad or invent additional movements.`
  }
  return `There are ${entryCount} entries spanning ${weeks} weeks. Group entries by arc movement (what shifted), not by week. Select the most significant shifts. The artifact should have no more than 10 sections regardless of entry count.`
}
