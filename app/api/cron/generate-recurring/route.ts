import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

import { publicEnv } from '@/lib/env'
import { generateRecurringTasks } from '@/lib/queries/recurrence'
import type { Database } from '@/lib/database.types'

/**
 * Daily recurrence generator (spec.md §5.1), triggered by the Vercel cron
 * declared in vercel.json.
 *
 * This is the ONLY module permitted to read SUPABASE_SERVICE_ROLE_KEY
 * (CLAUDE.md §3). The key bypasses RLS entirely, which is exactly what this
 * job needs — it runs with no user session and must see every workspace — and
 * exactly why it must never be imported anywhere a browser bundle can reach.
 *
 * Force dynamic: this must never be prerendered or cached.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is
 * set on the project. Without that check the endpoint is a public write
 * trigger, so a missing secret fails closed rather than open.
 */
function isAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

async function handle(request: NextRequest) {
  if (!isAuthorised(request)) {
    // Deliberately vague: do not tell an unauthenticated caller whether the
    // secret is unset or merely wrong.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' },
      { status: 500 },
    )
  }

  const env = publicEnv()
  const supabase = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const summary = await generateRecurringTasks(supabase)

  return NextResponse.json(
    {
      ok: summary.errors.length === 0,
      ranAt: new Date().toISOString(),
      ...summary,
    },
    { status: summary.errors.length === 0 ? 200 : 207 },
  )
}

export async function GET(request: NextRequest) {
  return handle(request)
}

/** POST too, so the endpoint can be triggered by hand with curl. */
export async function POST(request: NextRequest) {
  return handle(request)
}
