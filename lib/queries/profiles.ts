import { z } from 'zod'

import { capacitySchema } from '@/lib/queries/workload'
import { createClient } from '@/lib/supabase/server'
import type { Profile, QueryResult } from '@/lib/types'

/**
 * The signed-in user's profile row, or null if there is no session.
 *
 * Returns null (rather than throwing) when the row is missing, which is the
 * signal that the `handle_new_user` trigger did not fire for this user.
 */
export async function getMyProfile(): Promise<QueryResult<Profile | null>> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: true, data: null }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }

  return { ok: true, data }
}

/**
 * Updates the signed-in user's own profile — including
 * `weekly_capacity_hours`, the denominator for the whole Workload view.
 *
 * `profiles_update` restricts this to `id = auth.uid()`, so the id comes from
 * the session and is never accepted from the form.
 */
export async function updateMyProfile(input: unknown): Promise<QueryResult<Profile>> {
  const parsed = capacitySchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You are not signed in.' }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      job_title: parsed.data.jobTitle || null,
      weekly_capacity_hours: parsed.data.weeklyCapacityHours,
      timezone: parsed.data.timezone,
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Could not update your profile.' }

  return { ok: true, data }
}
