import { z } from 'zod'

import { POSITION_GAP } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult, StatusCategory, WorkflowStatus } from '@/lib/types'

const CATEGORIES = [
  'todo',
  'in_progress',
  'blocked',
  'done',
  'cancelled',
] as const satisfies readonly StatusCategory[]

export const createStatusSchema = z.object({
  projectId: z.uuid('Invalid project'),
  name: z
    .string()
    .trim()
    .min(1, 'Column name is required')
    .max(40, 'Column name must be 40 characters or fewer'),
  category: z.enum(CATEGORIES, { message: 'Pick a category' }),
  wipLimit: z
    .union([z.literal(''), z.coerce.number().int().min(1, 'WIP limit must be at least 1').max(999)])
    .optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#94a3b8'),
})

export const updateStatusSchema = z.object({
  statusId: z.uuid(),
  name: z.string().trim().min(1, 'Column name is required').max(40),
  category: z.enum(CATEGORIES),
  wipLimit: z
    .union([z.literal(''), z.coerce.number().int().min(1, 'WIP limit must be at least 1').max(999)])
    .optional(),
})

function nullify<T extends string | number>(value: T | '' | undefined): T | null {
  return value === '' || value === undefined ? null : value
}

function describeWriteError(error: { code?: string; message: string }) {
  if (error.code === '42501') {
    return { ok: false as const, error: 'You have view-only access to this project.' }
  }
  if (error.code === '23505') {
    return { ok: false as const, error: 'A column with that name already exists in this project.' }
  }
  if (error.code === '23503') {
    // tasks.status_id is ON DELETE RESTRICT — deliberately, so a delete can
    // never orphan or silently move someone's work.
    return {
      ok: false as const,
      error: 'That column still has tasks in it. Move them to another column first.',
    }
  }
  return { ok: false as const, error: error.message }
}

export async function listStatuses(
  projectId: string,
): Promise<QueryResult<WorkflowStatus[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workflow_statuses')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: data ?? [] }
}

export async function createStatus(input: unknown): Promise<QueryResult<WorkflowStatus>> {
  const parsed = createStatusSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()

  const { data: last } = await supabase
    .from('workflow_statuses')
    .select('position')
    .eq('project_id', parsed.data.projectId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('workflow_statuses')
    .insert({
      project_id: parsed.data.projectId,
      name: parsed.data.name,
      category: parsed.data.category,
      wip_limit: nullify(parsed.data.wipLimit),
      color: parsed.data.color,
      position: (last?.position ?? 0) + POSITION_GAP,
    })
    .select()
    .single()

  if (error) return describeWriteError(error)

  return { ok: true, data }
}

export async function updateStatus(input: unknown): Promise<QueryResult<null>> {
  const parsed = updateStatusSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('workflow_statuses')
    .update(
      {
        name: parsed.data.name,
        category: parsed.data.category,
        wip_limit: nullify(parsed.data.wipLimit),
      },
      { count: 'exact' },
    )
    .eq('id', parsed.data.statusId)

  if (error) return describeWriteError(error)
  if (count === 0) return { ok: false, error: 'You have view-only access to this project.' }

  return { ok: true, data: null }
}

/**
 * Moves a column one place left or right by swapping positions with its
 * neighbour. Swapping two rows is enough because `position` is sparse — there
 * is no need to renumber the whole board.
 */
export async function moveStatus(
  statusId: unknown,
  direction: unknown,
): Promise<QueryResult<null>> {
  const parsedId = z.uuid().safeParse(statusId)
  const parsedDir = z.enum(['left', 'right']).safeParse(direction)
  if (!parsedId.success || !parsedDir.success) {
    return { ok: false, error: 'Invalid move.' }
  }

  const supabase = await createClient()

  const { data: current, error: currentError } = await supabase
    .from('workflow_statuses')
    .select('id, project_id, position')
    .eq('id', parsedId.data)
    .maybeSingle()

  if (currentError) return { ok: false, error: currentError.message }
  if (!current) return { ok: false, error: 'That column no longer exists.' }

  const isLeft = parsedDir.data === 'left'
  const { data: neighbour, error: neighbourError } = await supabase
    .from('workflow_statuses')
    .select('id, position')
    .eq('project_id', current.project_id)
    .order('position', { ascending: !isLeft })
    [isLeft ? 'lt' : 'gt']('position', current.position)
    .limit(1)
    .maybeSingle()

  if (neighbourError) return { ok: false, error: neighbourError.message }
  if (!neighbour) return { ok: true, data: null } // already at the end

  const [a, b] = await Promise.all([
    supabase
      .from('workflow_statuses')
      .update({ position: neighbour.position }, { count: 'exact' })
      .eq('id', current.id),
    supabase
      .from('workflow_statuses')
      .update({ position: current.position }, { count: 'exact' })
      .eq('id', neighbour.id),
  ])

  if (a.error) return describeWriteError(a.error)
  if (b.error) return describeWriteError(b.error)
  if (a.count === 0 || b.count === 0) {
    return { ok: false, error: 'You have view-only access to this project.' }
  }

  return { ok: true, data: null }
}

export async function deleteStatus(statusId: unknown): Promise<QueryResult<null>> {
  const parsed = z.uuid().safeParse(statusId)
  if (!parsed.success) return { ok: false, error: 'Invalid column.' }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('workflow_statuses')
    .delete({ count: 'exact' })
    .eq('id', parsed.data)

  if (error) return describeWriteError(error)
  if (count === 0) {
    return { ok: false, error: 'Nothing was deleted — you may have view-only access.' }
  }

  return { ok: true, data: null }
}
