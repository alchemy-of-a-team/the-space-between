/**
 * Input types for artifact prompt construction.
 * These define the contract between the API route (data fetching)
 * and the prompt builder (prompt construction).
 */

export interface ArtifactEntry {
  author_name: string
  content: string
  created_at: string
}

export interface ArtifactReflection {
  what_shifted: string | null
  what_unnamed: string | null
  compound_question_now: string | null
  created_at: string
}

export interface ArtifactCreativeDirection {
  medium: string
  symbolic_language: string
  coach_synthesis: string
}

export interface BuildPromptParams {
  entries: ArtifactEntry[]
  reflections?: ArtifactReflection[]
  creative_direction?: ArtifactCreativeDirection
  isCoach: boolean
}
