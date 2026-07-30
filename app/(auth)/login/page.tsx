import Link from 'next/link'

import { LoginForm } from './login-form'

export const metadata = { title: 'Sign in · Teamflow' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <>
      <h2 className="mb-6 text-lg font-medium text-slate-900">Sign in</h2>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-slate-500">
        No account?{' '}
        <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
          Create one
        </Link>
      </p>
    </>
  )
}
