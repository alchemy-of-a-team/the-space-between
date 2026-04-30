'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import type { Profile, Reflection } from '@/lib/types'

const MEDIUMS = [
  { value: 'prose', label: 'Prose with illustrated section headers' },
  { value: 'comic strip', label: 'Comic strip / sequential art' },
  { value: 'illustrated timeline', label: 'Illustrated timeline' },
  { value: 'infographic', label: 'Infographic' },
]

const SYMBOLIC_LANGUAGES = [
  { value: 'esoteric/hermetic', label: 'Esoteric / Hermetic (alchemical, tarot)' },
  { value: 'nature/seasons', label: 'Nature / Seasons (light, growth, landscape)' },
  { value: 'minimalist/clean', label: 'Minimalist / Clean (space, architecture)' },
  { value: 'military/tactical', label: 'Military / Tactical (terrain, strategy)' },
  { value: 'astrological', label: 'Astrological (planetary, celestial)' },
  { value: 'tattoo art', label: 'Tattoo art (symbolic, bold)' },
]

export function GenerateArtifactClient({
  containerId,
  profile,
  lastMedium,
  lastLanguage,
}: {
  containerId: string
  profile: Profile
  lastMedium: string
  lastLanguage: string
}) {
  const router = useRouter()
  const isCoach = profile.role === 'coach' || profile.role === 'admin'

  const [medium, setMedium] = useState(lastMedium || 'prose')
  const [symbolicLanguage, setSymbolicLanguage] = useState(lastLanguage || 'minimalist/clean')
  const [coachSynthesis, setCoachSynthesis] = useState('')
  const [reflections, setReflections] = useState<Reflection[]>([])
  const [generating, setGenerating] = useState(false)
  const [loadingReflections, setLoadingReflections] = useState(true)

  useEffect(() => {
    if (!isCoach) {
      setLoadingReflections(false)
      return
    }
    async function load() {
      const res = await fetch(`/api/reflections?container_id=${containerId}`)
      const data = await res.json()
      setReflections(data)
      setLoadingReflections(false)
    }
    load()
  }, [containerId, isCoach])

  async function handleGenerate() {
    setGenerating(true)

    const body: Record<string, string> = { container_id: containerId }
    if (isCoach) {
      body.medium = medium
      body.symbolic_language = symbolicLanguage
      body.coach_synthesis = coachSynthesis
    }

    const res = await fetch('/api/artifact/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      router.push(`/containers/${containerId}/artifact`)
    } else {
      const err = await res.json().catch(() => ({ error: 'Generation failed' }))
      toast.error(err.error || 'Generation failed')
      setGenerating(false)
    }
  }

  // Client path: simpler generation
  if (!isCoach) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AppHeader userName={profile.full_name} role={profile.role} />
        <main className="max-w-2xl mx-auto px-6 py-10">
          <Link href={`/containers/${containerId}/artifact`} className="text-sm text-stone-400 hover:text-stone-600 mb-8 block">
            &larr; Back to artifact
          </Link>

          <h1 className="text-2xl font-serif text-stone-800 mb-4">Generate your artifact</h1>
          <p className="text-stone-500 mb-8">
            This will create a visualization of your journey from the entries you have shared.
          </p>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? 'Generating... this may take a moment' : 'Generate artifact'}
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader userName={profile.full_name} role={profile.role} />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link href={`/containers/${containerId}/artifact`} className="text-sm text-stone-400 hover:text-stone-600 mb-8 block">
          &larr; Back to artifact
        </Link>

        <h1 className="text-2xl font-serif text-stone-800 mb-8">Generate emergence artifact</h1>

        {/* Review reflections */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-stone-600 mb-3">
            Your accumulated reflections ({reflections.length})
          </h2>
          {loadingReflections ? (
            <p className="text-stone-400 text-sm">Loading...</p>
          ) : reflections.length === 0 ? (
            <p className="text-stone-400 text-sm">No reflections yet. The artifact will generate from entries only.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {reflections.map((r) => (
                <div key={r.id} className="bg-stone-100/50 rounded-lg p-4 text-sm">
                  <div className="text-xs text-stone-400 mb-2">
                    {new Date(r.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  {r.what_shifted && (
                    <p className="text-stone-600 mb-1">
                      <span className="font-medium">What shifted:</span> {r.what_shifted}
                    </p>
                  )}
                  {r.what_unnamed && (
                    <p className="text-stone-600 mb-1">
                      <span className="font-medium">What unnamed:</span> {r.what_unnamed}
                    </p>
                  )}
                  {r.compound_question_now && (
                    <p className="text-stone-600">
                      <span className="font-medium">Compound question:</span> {r.compound_question_now}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Creative direction */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>What artistic medium will resonate most powerfully with this client?</Label>
            <Select value={medium} onValueChange={(v) => v && setMedium(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDIUMS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>What symbolic language will resonate most closely for this client?</Label>
            <Select value={symbolicLanguage} onValueChange={(v) => v && setSymbolicLanguage(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYMBOLIC_LANGUAGES.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Your final synthesis</Label>
            <p className="text-xs text-stone-400">
              Summarize the client&apos;s arc in your own words. Use the symbolic language. This anchors the artifact.
            </p>
            <Textarea
              value={coachSynthesis}
              onChange={(e) => setCoachSynthesis(e.target.value)}
              className="min-h-[120px] bg-white resize-none"
              placeholder="What is the arc of this client's work? Use the symbolic language to describe it..."
            />
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? 'Generating... this may take a moment' : 'Generate artifact'}
          </Button>
        </div>
      </main>
    </div>
  )
}
