import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'

export const credentialsSchema = z.object({
  email: z.email('Enter a valid email address').trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signUpSchema = credentialsSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or fewer'),
})

export type Credentials = z.infer<typeof credentialsSchema>
export type SignUpInput = z.infer<typeof signUpSchema>

/** Discriminates "you're in" from "we emailed you a confirmation link". */
export type SignUpOutcome = { session: 'active' } | { session: 'pending_email_confirmation' }

/**
 * Creates the auth user. The `handle_new_user` trigger in 0001_init.sql
 * inserts the matching `profiles` row — we never insert it from the app.
 *
 * `full_name` is passed through user metadata because that is what the
 * trigger reads; it falls back to the local part of the email.
 */
export async function signUp(input: unknown): Promise<QueryResult<SignUpOutcome>> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  })

  if (error) return { ok: false, error: error.message }

  return {
    ok: true,
    data: data.session
      ? { session: 'active' }
      : { session: 'pending_email_confirmation' },
  }
}

export async function signIn(input: unknown): Promise<QueryResult<null>> {
  const parsed = credentialsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  // Supabase returns the same message for bad password and unknown user,
  // which is what we want — no account enumeration.
  if (error) return { ok: false, error: error.message }

  return { ok: true, data: null }
}

export async function signOut(): Promise<QueryResult<null>> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: null }
}
