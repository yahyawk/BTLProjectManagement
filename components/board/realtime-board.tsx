'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

/**
 * Keeps the board in step with other people's changes (spec.md §8 M6).
 *
 * Deliberately dumb: on any change to a task in this project it calls
 * `router.refresh()` and lets the server re-render. Patching rows client-side
 * would mean reimplementing the ordering and label joins from `getBoard` in a
 * second place, and they would drift.
 *
 * DELETE payloads only carry the primary key unless the table has REPLICA
 * IDENTITY FULL — migration 0006 sets that, so the `project_id` filter below
 * matches deletes too.
 */
export function RealtimeBoard({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [live, setLive] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`board:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        () => router.refresh(),
      )
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [projectId, router])

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-subtle"
      title={
        live
          ? 'Connected — changes from teammates appear automatically'
          : 'Not connected; refresh to see changes from teammates'
      }
    >
      <span aria-hidden className="relative grid size-1.5 place-items-center">
        {live ? (
          <span className="absolute size-2.5 animate-ping rounded-full bg-success/40" />
        ) : null}
        <span className={`size-1.5 rounded-full ${live ? 'bg-success' : 'bg-subtle'}`} />
      </span>
      {live ? 'Live' : 'Offline'}
    </span>
  )
}
