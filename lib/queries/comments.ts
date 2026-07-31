import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'

export const addCommentSchema = z.object({
  taskId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, 'Write something first')
    .max(4000, 'Comments must be 4000 characters or fewer'),
})

export type CommentWithAuthor = {
  id: string
  body: string
  created_at: string
  author_id: string
  author_name: string
}

export async function listComments(
  taskId: string,
): Promise<QueryResult<CommentWithAuthor[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_comments')
    .select('id, body, created_at, author_id, profiles!inner(full_name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) return { ok: false, error: error.message }

  const comments = (data ?? []).map((row) => ({
    id: row.id,
    body: row.body,
    created_at: row.created_at,
    author_id: row.author_id,
    author_name: row.profiles.full_name,
  }))

  return { ok: true, data: comments }
}

/**
 * `author_id` is taken from the session, never from the form — `comments_insert`
 * enforces `author_id = auth.uid()`, so a spoofed value would be rejected
 * anyway, but not sending one at all is the clearer contract.
 *
 * Viewers may comment on purpose (see migration 0004).
 */
export async function addComment(input: unknown): Promise<QueryResult<null>> {
  const parsed = addCommentSchema.safeParse(input)
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

  const { error } = await supabase.from('task_comments').insert({
    task_id: parsed.data.taskId,
    author_id: user.id,
    body: parsed.data.body,
  })

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: null }
}

export async function deleteComment(commentId: unknown): Promise<QueryResult<null>> {
  const parsed = z.uuid().safeParse(commentId)
  if (!parsed.success) return { ok: false, error: 'Invalid comment.' }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('task_comments')
    .delete({ count: 'exact' })
    .eq('id', parsed.data)

  if (error) return { ok: false, error: error.message }
  if (count === 0) return { ok: false, error: 'You can only delete your own comments.' }

  return { ok: true, data: null }
}
