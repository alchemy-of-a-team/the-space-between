'use client'

import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { VoiceRecorder } from '@/components/voice-recorder'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Profile, Container, Entry } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  invited: 'Awaiting client',
  active: 'Active',
  closing: 'Winding down',
  closed: 'Complete',
}

export function SharedSpaceClient({
  container,
  profile,
}: {
  container: Container
  profile: Profile
}) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [newEntry, setNewEntry] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(container.status)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Reflection fields (coach only)
  const [showReflection, setShowReflection] = useState(false)
  const [whatShifted, setWhatShifted] = useState('')
  const [whatUnnamed, setWhatUnnamed] = useState('')
  const [compoundNow, setCompoundNow] = useState('')
  const [savingReflection, setSavingReflection] = useState(false)

  const isCoach = profile.role === 'coach' || profile.role === 'admin'

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/entries?container_id=${container.id}`)
      const data = await res.json()
      setEntries(data)
      setLoading(false)
    }
    load()
  }, [container.id])

  async function handleSubmitEntry() {
    if (!newEntry.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ container_id: container.id, content: newEntry }),
      })

      if (res.ok) {
        const entry = await res.json()
        setEntries(prev => [...prev, entry])
        setNewEntry('')
      } else {
        toast.error('Failed to send entry. Please try again.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    }
    setSubmitting(false)
  }

  async function handleSaveReflection() {
    if (!whatShifted.trim() && !whatUnnamed.trim() && !compoundNow.trim()) return
    setSavingReflection(true)

    try {
      const res = await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          container_id: container.id,
          what_shifted: whatShifted,
          what_unnamed: whatUnnamed,
          compound_question_now: compoundNow,
        }),
      })

      if (res.ok) {
        setWhatShifted('')
        setWhatUnnamed('')
        setCompoundNow('')
        setShowReflection(false)
        toast.success('Reflection saved.')
      } else {
        toast.error('Failed to save reflection. Please try again.')
      }
    } catch {
      toast.error('Network error. Your reflection was not saved.')
    }
    setSavingReflection(false)
  }

  async function handleCloseEngagement() {
    try {
      const res = await fetch(`/api/containers/${container.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (res.ok) {
        setStatus('closed')
        setShowCloseConfirm(false)
        toast.success('Engagement closed.')
      } else {
        toast.error('Failed to close engagement.')
      }
    } catch {
      toast.error('Network error.')
    }
  }

  const coachName = (container.coach as unknown as Profile)?.full_name
  const clientName = (container.client as unknown as Profile)?.full_name

  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader userName={profile.full_name} role={profile.role} />
      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Back link */}
        <Link href="/dashboard" className="text-sm text-stone-400 hover:text-stone-600 mb-6 block">
          &larr; Back to dashboard
        </Link>

        {/* Compound question */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-8">
          <p className="text-lg font-serif text-stone-700 text-center italic">
            {container.compound_question}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-sm text-stone-500">
            {container.title && <span className="font-medium text-stone-700">{container.title}</span>}
            <span>{coachName} &amp; {clientName || 'awaiting client'}</span>
            <Badge variant="secondary">{STATUS_LABELS[status] || status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/containers/${container.id}/artifact`}>
              <Button variant="outline" size="sm">View artifact</Button>
            </Link>
            {isCoach && status === 'active' && (
              <Button variant="ghost" size="sm" onClick={() => setShowCloseConfirm(true)}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Close confirmation dialog */}
        <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif">Close this engagement?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-stone-600 mt-2">
              This will close the shared space. Neither you nor your client will be able to add new entries. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowCloseConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleCloseEngagement}>Close engagement</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Entries */}
        <div className="space-y-4 mb-8">
          {loading ? (
            <p className="text-stone-400 text-center py-8">Loading entries...</p>
          ) : entries.length === 0 ? (
            <p className="text-stone-400 text-center py-8">
              The space is empty. Write something when you are ready.
            </p>
          ) : (
            entries.map((entry) => {
              const isAuthorCoach = (entry.author as unknown as Profile)?.role === 'coach' || (entry.author as unknown as Profile)?.role === 'admin'
              return (
                <div
                  key={entry.id}
                  className={`p-5 rounded-lg ${
                    isAuthorCoach ? 'bg-amber-50/50 border border-amber-100' : 'bg-white border border-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-stone-600">
                      {(entry.author as unknown as Profile)?.full_name}
                    </span>
                    <span className="text-xs text-stone-400">
                      {new Date(entry.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">
                    {entry.content}
                  </p>
                </div>
              )
            })
          )}
        </div>

        {/* Write box */}
        {status !== 'closed' && (
          <div className="space-y-3">
            <Textarea
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              placeholder="Write something..."
              className="min-h-[120px] bg-white resize-none"
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmitEntry} disabled={submitting || !newEntry.trim()}>
                {submitting ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        )}

        {/* Coach reflection prompt */}
        {isCoach && status !== 'closed' && (
          <>
            <Separator className="my-8" />
            <div>
              <button
                onClick={() => setShowReflection(!showReflection)}
                className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                {showReflection ? 'Hide post-session reflection' : 'Post-session reflection'}
              </button>

              {showReflection && (
                <div className="mt-4 space-y-4 bg-stone-100/50 rounded-lg p-5">
                  <p className="text-xs text-stone-400">
                    These reflections are private. Your client will never see them.
                  </p>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="what-shifted" className="text-sm font-medium text-stone-600">What shifted?</label>
                      <VoiceRecorder onTranscript={(t) => setWhatShifted(prev => prev ? `${prev} ${t}` : t)} />
                    </div>
                    <Textarea
                      id="what-shifted"
                      value={whatShifted}
                      onChange={(e) => setWhatShifted(e.target.value)}
                      className="min-h-[80px] bg-white resize-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="what-unnamed" className="text-sm font-medium text-stone-600">
                        What did you notice that the client hasn&apos;t named yet?
                      </label>
                      <VoiceRecorder onTranscript={(t) => setWhatUnnamed(prev => prev ? `${prev} ${t}` : t)} />
                    </div>
                    <Textarea
                      id="what-unnamed"
                      value={whatUnnamed}
                      onChange={(e) => setWhatUnnamed(e.target.value)}
                      className="min-h-[80px] bg-white resize-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="compound-now" className="text-sm font-medium text-stone-600">
                        Where is the compound question now?
                      </label>
                      <VoiceRecorder onTranscript={(t) => setCompoundNow(prev => prev ? `${prev} ${t}` : t)} />
                    </div>
                    <Textarea
                      id="compound-now"
                      value={compoundNow}
                      onChange={(e) => setCompoundNow(e.target.value)}
                      className="min-h-[80px] bg-white resize-none text-sm"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveReflection}
                      disabled={savingReflection || (!whatShifted.trim() && !whatUnnamed.trim() && !compoundNow.trim())}
                      size="sm"
                    >
                      {savingReflection ? 'Saving...' : 'Save reflection'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
