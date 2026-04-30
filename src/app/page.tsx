import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-serif text-lg text-stone-800">The Space Between</span>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl font-serif text-stone-800 mb-6 leading-tight">
          A quiet place for the work between sessions
        </h1>
        <p className="text-lg text-stone-600 mb-4 leading-relaxed">
          The Space Between holds a shared running context between you and your coaching client.
          One question anchors the engagement. Entries accumulate. At any point,
          an emergence artifact renders the arc of what is unfolding.
        </p>
        <p className="text-stone-500 mb-8">
          Built for coaches doing personal transformation work at premium pricing.
        </p>
        <Link href="/signup">
          <Button size="lg" className="px-8">
            Start your practice &mdash; $125/month
          </Button>
        </Link>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <h3 className="font-serif text-lg text-stone-800 mb-2">The shared space</h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              One compound question anchors the engagement:
              &ldquo;What do you want to do all day, and what will it take to have that life?&rdquo;
              Both you and your client write into the space. No prompts. No nudges.
              The space waits.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-lg text-stone-800 mb-2">Private reflections</h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              After each session, record what shifted. What the client hasn&apos;t named yet.
              Where the compound question lives now. Voice or text.
              These reflections are yours alone. They feed the artifact.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-lg text-stone-800 mb-2">The emergence artifact</h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              At any point, generate a personal visualization of your client&apos;s arc.
              Choose the artistic medium and symbolic language.
              The artifact renders the transformation, not a summary of it.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-md mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-serif text-stone-800 mb-4">$125/month</h2>
        <p className="text-stone-500 mb-6">
          Unlimited engagements. Unlimited artifacts.
          Voice reflections. No per-client fees.
        </p>
        <Link href="/signup">
          <Button size="lg" className="px-8">Get started</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-stone-400">
          The Space Between
        </div>
      </footer>
    </div>
  )
}
