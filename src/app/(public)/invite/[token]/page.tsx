'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [invite, setInvite] = useState<{ email: string; container_id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkInvite() {
      const { data, error } = await supabase
        .from('invites')
        .select('email, container_id, accepted')
        .eq('token', token)
        .single()

      if (error || !data) {
        setError('This invite link is not valid.')
        setLoading(false)
        return
      }

      if (data.accepted) {
        setError('This invite has already been accepted.')
        setLoading(false)
        return
      }

      setInvite({ email: data.email, container_id: data.container_id })
      setLoading(false)
    }
    checkInvite()
  }, [token, supabase])

  async function handleAccept() {
    setAccepting(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Already logged in, accept directly
      const res = await fetch(`/api/invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })
      if (res.ok) {
        router.push(`/containers/${invite!.container_id}`)
      } else {
        setError('Failed to accept invite')
        setAccepting(false)
      }
    } else {
      // Not logged in, redirect to client signup with token
      router.push(`/signup/client?token=${token}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-500">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-stone-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif text-stone-800">You&apos;ve been invited</CardTitle>
          <p className="text-stone-500 text-sm mt-1">
            A coach has created a space for your work together.
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAccept} className="w-full" disabled={accepting}>
            {accepting ? 'Accepting...' : 'Accept and enter'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
