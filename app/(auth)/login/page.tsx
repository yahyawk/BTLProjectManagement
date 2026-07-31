import Link from 'next/link'

import { LoginForm } from './login-form'

export const metadata = { title: 'Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <>
      <h2 className="mb-1 text-base font-semibold text-fg">Welcome back</h2>
      <p className="mb-6 text-sm text-muted">Sign in to your workspace.</p>
      <LoginForm next={next} />
      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
        No account?{' '}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>
    </>
  )
}
