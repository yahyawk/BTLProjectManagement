import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'

export const logTimeSchema = z.object({
  taskId: z.uuid(),
  // The column is `check (hours > 0 and hours <= 24)` — mirrored here so the
  // user gets a sentence rather than a constraint violation.
  hours: z.coerce
    .number({ message: 'Hours must be a number' })
    .gt(0, 'Log more than zero hours')
    .max(24, 'A single entry cannot exceed 24 hours'),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  note: z.string().trim().max(300).optional().or(z.literal('')),
})

export type TimeEntryRow = {
  id: string
  hours: number
  entryDate: string
  note: string | null
  userId: string
  userName: string
}

export type TaskTimeSummary = {
  entries: TimeEntryRow[]
  totalHours: number
  myHours: number
}

/**
 * Time logged against a task, by everyone who can see it.
 *
 * `time_select` lets any project member read entries, but `time_write` scopes
 * inserts, updates and deletes to `user_id = auth.uid()` — so you see the
 * team's actuals but can only change your own.
 */
export async function getTaskTime(taskId: string): Promise<QueryResult<TaskTimeSummary>> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('time_entries')
    .select('id, hours, entry_date, note, user_id, profiles!inner(full_name)')
    .eq('task_id', taskId)
    .order('entry_date', { ascending: false })

  if (error) return { ok: false, error: error.message }

  const entries = (data ?? []).map((row) => ({
    id: row.id,
    hours: Number(row.hours),
    entryDate: row.entry_date,
    note: row.note,
    userId: row.user_id,
    userName: row.profiles.full_name,
  }))

  return {
    ok: true,
    data: {
      entries,
      totalHours: entries.reduce((sum, e) => sum + e.hours, 0),
      myHours: entries
        .filter((e) => e.userId === user?.id)
        .reduce((sum, e) => sum + e.hours, 0),
    },
  }
}

export async function logTime(input: unknown): Promise<QueryResult<null>> {
  const parsed = logTimeSchema.safeParse(input)
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

  // user_id comes from the session, never the form — `time_write` requires
  // `user_id = auth.uid()` and would reject anything else anyway.
  const { error } = await supabase.from('time_entries').insert({
    task_id: parsed.data.taskId,
    user_id: user.id,
    hours: parsed.data.hours,
    entry_date: parsed.data.entryDate,
    note: parsed.data.note || null,
  })

  if (error) {
    if (error.code === '42501') {
      return { ok: false, error: 'You cannot log time against this task.' }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true, data: null }
}

export async function deleteTimeEntry(entryId: unknown): Promise<QueryResult<null>> {
  const parsed = z.uuid().safeParse(entryId)
  if (!parsed.success) return { ok: false, error: 'Invalid entry.' }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('time_entries')
    .delete({ count: 'exact' })
    .eq('id', parsed.data)

  if (error) return { ok: false, error: error.message }
  if (count === 0) return { ok: false, error: 'You can only delete your own time entries.' }

  return { ok: true, data: null }
}
