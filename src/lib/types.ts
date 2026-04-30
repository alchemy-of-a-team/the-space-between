export interface Profile {
  id: string
  full_name: string
  role: 'admin' | 'coach' | 'client'
  created_at: string
}

export interface Container {
  id: string
  coach_id: string
  client_id: string | null
  title: string | null
  compound_question: string
  status: 'invited' | 'active' | 'closing' | 'closed'
  start_date: string
  end_date: string
  created_at: string
  // joined fields
  coach?: Profile
  client?: Profile
  entries?: Entry[]
  invites?: Invite[]
}

export interface Entry {
  id: string
  container_id: string
  author_id: string
  content: string
  created_at: string
  author?: Profile
}

export interface Reflection {
  id: string
  container_id: string
  coach_id: string
  what_shifted: string | null
  what_unnamed: string | null
  compound_question_now: string | null
  created_at: string
}

export interface ArtifactSection {
  sequence: number
  week_range: string
  visual_header: string
  body: string
  coach_margin_note: string | null
  quotes_used: string[]
  accent_color: string | null
}

export interface ArtifactContent {
  artifact_version: string
  title: string
  medium: string
  symbolic_language: string
  coach_synthesis: string
  sections: ArtifactSection[]
  closing: string | null
  metadata: {
    entry_count: number
    reflection_count: number
    engagement_weeks: number
    generated_at: string
    model: string
    prompt_version: string
  }
}

export interface Artifact {
  id: string
  container_id: string
  generated_by: string
  medium: string | null
  symbolic_language: string | null
  coach_synthesis: string | null
  content: ArtifactContent
  narrative: string
  generated_at: string
}

export interface Invite {
  id: string
  container_id: string
  email: string
  token: string
  accepted: boolean
  created_at: string
}

export interface Subscription {
  id: string
  coach_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  current_period_end: string
  created_at: string
}
