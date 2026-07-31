import Link from 'next/link'

import { SignupForm } from './signup-form'

export const metadata = { title: 'Create account' }

export default function SignupPage() {
  return (
    <>
      <h2 className="mb-1 text-base font-semibold text-fg">Create your account</h2>
      <p className="mb-6 text-sm text-muted">Takes about ten seconds.</p>
      <SignupForm />
      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
