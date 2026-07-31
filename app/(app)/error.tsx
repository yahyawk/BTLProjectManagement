'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/field'
import { IconAlert } from '@/components/ui/icons'

/**
 * Error boundary for every protected route (spec.md §8 M6).
 *
 * Shows `error.digest` rather than the message: Next replaces server error
 * messages with a generic string in production anyway, and the digest is what
 * correlates a user's report with the Vercel runtime log.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="surface-card mx-auto max-w-md animate-rise p-8 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-danger/12 text-danger">
        <IconAlert className="size-5" />
      </span>
      <h1 className="mt-4 text-base font-semibold text-fg">Something went wrong</h1>
      <p className="mt-1 text-sm text-muted">
        This page failed to load. The rest of the app should still work.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-subtle">Reference: {error.digest}</p>
      ) : null}
      <Button variant="primary" onClick={reset} className="mt-5">
        Try again
      </Button>
    </div>
  )
}
