import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { POSITION_GAP } from '@/lib/constants'
import type { QueryResult, TaskChecklistItem } from '@/lib/types'

export const addChecklistItemSchema = z.object({
  taskId: z.uuid(),
  content: z
    .string()
    .trim()
    .min(1, 'Add some text')
    .max(200, 'Checklist items must be 200 characters or fewer'),
})

export async function listChecklist(
  taskId: string,
): Promise<QueryResult<TaskChecklistItem[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_checklist_items')
    .select('*')
    .eq('task_id', taskId)
    .order('position', { ascending: true })

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: data ?? [] }
}

export async function addChecklistItem(
  input: unknown,
): Promise<QueryResult<TaskChecklistItem>> {
  const parsed = addChecklistItemSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()

  const { data: last } = await supabase
    .from('task_checklist_items')
    .select('position')
    .eq('task_id', parsed.data.taskId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('task_checklist_items')
    .insert({
      task_id: parsed.data.taskId,
      content: parsed.data.content,
      position: (last?.position ?? 0) + POSITION_GAP,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '42501') {
      return { ok: false, error: 'You have view-only access to this project.' }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true, data }
}

export async function setChecklistItemDone(
  itemId: unknown,
  isDone: unknown,
): Promise<QueryResult<null>> {
  const parsedId = z.uuid().safeParse(itemId)
  const parsedDone = z.boolean().safeParse(isDone)

  if (!parsedId.success || !parsedDone.success) {
    return { ok: false, error: 'Invalid checklist item.' }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('task_checklist_items')
    .update({ is_done: parsedDone.data }, { count: 'exact' })
    .eq('id', parsedId.data)

  if (error) return { ok: false, error: error.message }
  if (count === 0) return { ok: false, error: 'You have view-only access to this project.' }

  return { ok: true, data: null }
}

export async function deleteChecklistItem(itemId: unknown): Promise<QueryResult<null>> {
  const parsed = z.uuid().safeParse(itemId)
  if (!parsed.success) return { ok: false, error: 'Invalid checklist item.' }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('task_checklist_items')
    .delete({ count: 'exact' })
    .eq('id', parsed.data)

  if (error) return { ok: false, error: error.message }
  if (count === 0) return { ok: false, error: 'You have view-only access to this project.' }

  return { ok: true, data: null }
}
