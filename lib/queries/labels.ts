import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { Label, QueryResult } from '@/lib/types'

export const createLabelSchema = z.object({
  projectId: z.uuid('Invalid project'),
  name: z
    .string()
    .trim()
    .min(1, 'Label name is required')
    .max(40, 'Label name must be 40 characters or fewer'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour')
    .default('#64748b'),
})

export async function listLabels(projectId: string): Promise<QueryResult<Label[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: data ?? [] }
}

export async function createLabel(input: unknown): Promise<QueryResult<Label>> {
  const parsed = createLabelSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('labels')
    .insert({
      project_id: parsed.data.projectId,
      name: parsed.data.name,
      color: parsed.data.color,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: `A label called “${parsed.data.name}” already exists.` }
    }
    if (error.code === '42501') {
      return { ok: false, error: 'You have view-only access to this project.' }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true, data }
}

export async function deleteLabel(labelId: unknown): Promise<QueryResult<null>> {
  const parsed = z.uuid().safeParse(labelId)
  if (!parsed.success) return { ok: false, error: 'Invalid label.' }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('labels')
    .delete({ count: 'exact' })
    .eq('id', parsed.data)

  if (error) return { ok: false, error: error.message }
  if (count === 0) return { ok: false, error: 'Nothing was deleted — you may have view-only access.' }

  return { ok: true, data: null }
}

/**
 * Replaces a task's labels with exactly `labelIds`.
 *
 * Delete-then-insert rather than diffing: task_labels is a two-column join
 * with a composite PK, so the write is trivial and the read-back is one less
 * round trip than computing the difference.
 */
export async function setTaskLabels(
  taskId: unknown,
  labelIds: unknown,
): Promise<QueryResult<null>> {
  const parsedTask = z.uuid().safeParse(taskId)
  const parsedLabels = z.array(z.uuid()).safeParse(labelIds)

  if (!parsedTask.success) return { ok: false, error: 'Invalid task.' }
  if (!parsedLabels.success) return { ok: false, error: 'Invalid labels.' }

  const supabase = await createClient()

  const { error: deleteError } = await supabase
    .from('task_labels')
    .delete()
    .eq('task_id', parsedTask.data)

  if (deleteError) {
    if (deleteError.code === '42501') {
      return { ok: false, error: 'You have view-only access to this project.' }
    }
    return { ok: false, error: deleteError.message }
  }

  if (parsedLabels.data.length === 0) return { ok: true, data: null }

  const { error: insertError } = await supabase
    .from('task_labels')
    .insert(parsedLabels.data.map((labelId) => ({ task_id: parsedTask.data, label_id: labelId })))

  if (insertError) {
    if (insertError.code === '42501') {
      return { ok: false, error: 'You have view-only access to this project.' }
    }
    return { ok: false, error: insertError.message }
  }

  return { ok: true, data: null }
}
