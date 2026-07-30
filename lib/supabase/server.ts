import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { publicEnv } from '@/lib/env'
import type { Database } from '@/lib/database.types'

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Always request a fresh one per request — never hoist it to a module-level
 * singleton, or requests will share each other's auth cookies.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const env = publicEnv()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a Server Component, which cannot set cookies.
            // middleware.ts refreshes the session, so this is safe to swallow.
          }
        },
      },
    },
  )
}
