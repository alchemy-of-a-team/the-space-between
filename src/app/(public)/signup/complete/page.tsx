import { Suspense } from 'react'
import { SignupCompleteForm } from './signup-complete-form'

export default function SignupCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-500">Loading...</p>
      </div>
    }>
      <SignupCompleteForm />
    </Suspense>
  )
}
