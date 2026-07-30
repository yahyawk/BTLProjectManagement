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
