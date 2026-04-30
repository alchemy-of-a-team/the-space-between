'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const { url } = await res.json()
    if (url) {
      window.location.href = url
    } else {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif text-stone-800">Start your practice</CardTitle>
          <p className="text-stone-500 text-sm mt-2">
            $125/month. Hold space for your clients. Generate emergence artifacts that make the arc visible.
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCheckout} className="w-full" disabled={loading}>
            {loading ? 'Redirecting to checkout...' : 'Subscribe and get started'}
          </Button>
          <p className="text-xs text-stone-400 text-center mt-4">
            You&apos;ll create your account after payment.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
