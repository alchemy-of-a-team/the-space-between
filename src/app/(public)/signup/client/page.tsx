import { Suspense } from 'react'
import { ClientSignupForm } from './client-signup-form'

export default function ClientSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-500">Loading...</p>
      </div>
    }>
      <ClientSignupForm />
    </Suspense>
  )
}
