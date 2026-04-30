'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [valid, setValid] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkInvite() {
      const res = await fetch(`/api/invite/${token}`)
      if (!res.ok) {
        setError('This invite link is not valid.')
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.accepted) {
        setError('This invite has already been accepted.')
        setLoading(false)
        return
      }
      setValid(true)
      setLoading(false)
    }
    checkInvite()
  }, [token])

  async function handleAccept() {
    setAccepting(true)

    // Try accepting directly (will work if user is already signed in)
    const res = await fetch(`/api/invite/${token}`, { method: 'POST' })

    if (res.ok) {
      const { container_id } = await res.json()
      window.location.href = `/containers/${container_id}`
    } else if (res.status === 401) {
      // Not signed in, redirect to client signup
      router.push(`/signup/client?token=${token}`)
    } else {
      const err = await res.json().catch(() => ({ error: 'Failed to accept invite' }))
      setError(err.error)
      setAccepting(false)
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
