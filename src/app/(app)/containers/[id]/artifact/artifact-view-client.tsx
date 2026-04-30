'use client'

import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { ArtifactRenderer } from '@/components/artifact-renderer'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Profile, Artifact } from '@/lib/types'

export function ArtifactViewClient({
  containerId,
  profile,
}: {
  containerId: string
  profile: Profile
}) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const isCoach = profile.role === 'coach' || profile.role === 'admin'

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/artifacts?container_id=${containerId}`)
      const data = await res.json()
      setArtifacts(data)
      setLoading(false)
    }
    load()
  }, [containerId])

  const latest = artifacts[0]
  const previous = artifacts.slice(1)

  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader userName={profile.full_name} role={profile.role} />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/containers/${containerId}`} className="text-sm text-stone-400 hover:text-stone-600">
            &larr; Back to shared space
          </Link>
          <Link href={`/containers/${containerId}/artifact/generate`}>
            <Button>Generate artifact</Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-stone-400 text-center py-16">Loading...</p>
        ) : !latest ? (
          <div className="text-center py-16">
            <p className="text-stone-500 text-lg mb-4">No artifacts yet.</p>
            <p className="text-stone-400">
              {isCoach
                ? 'When you are ready, generate an emergence artifact from your shared entries and reflections.'
                : 'When you are ready, generate an artifact from your shared entries.'}
            </p>
          </div>
        ) : (
          <>
            <ArtifactRenderer artifact={latest} />

            {previous.length > 0 && (
              <div className="mt-12">
                <h3 className="text-sm font-medium text-stone-500 mb-4">Previous artifacts</h3>
                <div className="space-y-3">
                  {previous.map((artifact) => (
                    <div key={artifact.id}>
                      <button
                        onClick={() => setExpandedId(expandedId === artifact.id ? null : artifact.id)}
                        className="w-full text-left p-4 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-stone-700">
                            {artifact.content?.title || 'Untitled'}
                          </span>
                          <span className="text-xs text-stone-400">
                            {new Date(artifact.generated_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <span className="text-xs text-stone-400">
                          {artifact.medium} / {artifact.symbolic_language}
                        </span>
                      </button>
                      {expandedId === artifact.id && (
                        <div className="mt-2">
                          <ArtifactRenderer artifact={artifact} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
