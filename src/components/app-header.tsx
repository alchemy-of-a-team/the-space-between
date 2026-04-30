'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function AppHeader({ userName, role }: { userName: string; role?: string }) {
  const router = useRouter()

  async function handleSignOut() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function handleBilling() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  const isCoach = role === 'coach' || role === 'admin'

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="font-serif text-lg text-stone-800">
          The Space Between
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-500">{userName}</span>
          {isCoach && (
            <Button variant="ghost" size="sm" onClick={handleBilling}>
              Billing
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}
