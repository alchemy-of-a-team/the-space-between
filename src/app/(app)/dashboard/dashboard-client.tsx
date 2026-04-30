'use client'

import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import Link from 'next/link'
import type { Profile, Container } from '@/lib/types'

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

const statusColors: Record<string, string> = {
  invited: 'bg-amber-100 text-amber-800',
  active: 'bg-green-100 text-green-800',
  closing: 'bg-stone-100 text-stone-600',
  closed: 'bg-stone-200 text-stone-500',
}

export function DashboardClient({ profile }: { profile: Profile }) {
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creating, setCreating] = useState(false)

  const isCoach = profile.role === 'coach' || profile.role === 'admin'

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/containers')
      const data = await res.json()
      setContainers(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleCreate() {
    setCreating(true)
    const res = await fetch('/api/containers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, client_email: newEmail }),
    })
    if (res.ok) {
      const container = await res.json()
      // Reload containers to get full joined data
      const listRes = await fetch('/api/containers')
      setContainers(await listRes.json())
      setShowNew(false)
      setNewTitle('')
      setNewEmail('')
    }
    setCreating(false)
  }

  function getLastActivity(container: Container): string {
    const entries = container.entries || []
    if (entries.length === 0) return 'No entries yet'
    const latest = entries.reduce((a, b) =>
      new Date(a.created_at) > new Date(b.created_at) ? a : b
    )
    return formatTimeAgo(latest.created_at)
  }

  function getInviteLink(container: Container): string | null {
    const invite = container.invites?.find(i => !i.accepted)
    if (!invite) return null
    return `${window.location.origin}/invite/${invite.token}`
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader userName={profile.full_name} role={profile.role} />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-serif text-stone-800">
            {isCoach ? 'Your practice' : 'Your engagements'}
          </h1>
          {isCoach && (
            <Dialog open={showNew} onOpenChange={setShowNew}>
              <Button onClick={() => setShowNew(true)}>Start a new engagement</Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif">New engagement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">What would you like to call this engagement?</Label>
                    <Input
                      id="title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g., Alex's engagement"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Client&apos;s email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="client@example.com"
                    />
                  </div>
                  <Button onClick={handleCreate} className="w-full" disabled={creating}>
                    {creating ? 'Creating...' : 'Create engagement'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <p className="text-stone-500">Loading...</p>
        ) : containers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-stone-500 text-lg">
                {isCoach
                  ? 'No engagements yet. Start your first one.'
                  : 'No engagements yet. Your coach will invite you.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {containers.map((container) => {
              const clientName = container.client?.full_name
              const coachName = container.coach?.full_name
              const inviteLink = isCoach ? getInviteLink(container) : null

              return (
                <Link key={container.id} href={`/containers/${container.id}`}>
                  <Card className="hover:bg-stone-100/50 transition-colors cursor-pointer">
                    <CardContent className="py-4 px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h2 className="font-medium text-stone-800">
                              {container.title || (isCoach ? clientName || 'Awaiting client' : coachName || 'Unknown coach')}
                            </h2>
                            <Badge variant="secondary" className={statusColors[container.status]}>
                              {({ invited: 'Awaiting client', active: 'Active', closing: 'Winding down', closed: 'Complete' } as Record<string, string>)[container.status] || container.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            {isCoach && clientName && (
                              <span className="text-sm text-stone-500">{clientName}</span>
                            )}
                            {!isCoach && coachName && (
                              <span className="text-sm text-stone-500">with {coachName}</span>
                            )}
                            <span className="text-sm text-stone-400">
                              {(container.entries?.length || 0)} entries
                            </span>
                            <span className="text-sm text-stone-400">
                              {getLastActivity(container)}
                            </span>
                          </div>
                          {isCoach && inviteLink && container.status === 'invited' && (
                            <p className="text-xs text-stone-400 mt-1 truncate max-w-md">
                              Invite link: {inviteLink}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
