'use client'

import { useEffect } from 'react'

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
    <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <h1 className="text-base font-semibold text-red-900">Something went wrong</h1>
      <p className="mt-1 text-sm text-red-800">
        This page failed to load. The rest of the app should still work.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-red-700">Reference: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  )
}
