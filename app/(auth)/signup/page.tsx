import Link from 'next/link'

import { SignupForm } from './signup-form'

export const metadata = { title: 'Create account · Teamflow' }

export default function SignupPage() {
  return (
    <>
      <h2 className="mb-6 text-lg font-medium text-slate-900">Create your account</h2>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
