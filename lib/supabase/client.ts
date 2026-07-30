'use client'

import { createBrowserClient } from '@supabase/ssr'

import { publicEnv } from '@/lib/env'
import type { Database } from '@/lib/database.types'

/**
 * Supabase client for Client Components. Needed from M2 onward for optimistic
 * drag-and-drop and from M6 for Realtime channels.
 *
 * Reads only the anon key, so everything it can do is bounded by RLS.
 */
export function createClient() {
  const env = publicEnv()

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
