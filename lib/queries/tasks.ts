import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type {
  PriorityLevel,
  QueryResult,
  Task,
  WorkflowStatus,
  WorkType,
} from '@/lib/types'

/** Gap between sparse positions. New cards land at max + this. */
export const POSITION_GAP = 1024

const WORK_TYPES = ['recurring', 'adhoc'] as const satisfies readonly WorkType[]
const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const satisfies readonly PriorityLevel[]

/**
 * `work_type` has no default and no fallback — spec.md §4.1. If this ever
 * gains `.default(...)`, the app has lost the thing that makes it worth
 * building.
 */
export const createTaskSchema = z.object({
  projectId: z.uuid('Invalid project'),
  statusId: z.uuid('Pick a column'),
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must be 200 characters or fewer'),
  workType: z.enum(WORK_TYPES, { message: 'Choose whether this is recurring or ad-hoc' }),
  priority: z.enum(PRIORITIES).default('medium'),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  // Ad-hoc provenance (spec.md §5.2) — where did this interrupt come from?
  requestedBy: z.string().trim().max(120).optional().or(z.literal('')),
  sourceNote: z.string().trim().max(500).optional().or(z.literal('')),
})

export const updateTaskSchema = z.object({
  taskId: z.uuid(),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  workType: z.enum(WORK_TYPES, { message: 'Choose whether this is recurring or ad-hoc' }),
  priority: z.enum(PRIORITIES),
  statusId: z.uuid(),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  requestedBy: z.string().trim().max(120).optional().or(z.literal('')),
  sourceNote: z.string().trim().max(500).optional().or(z.literal('')),
})

/**
 * A move sends the neighbours it was dropped between, not a computed number.
 * The server reads their live positions, so a stale client cannot write a
 * position that collides with or leapfrogs its neighbours.
 */
export const moveTaskSchema = z.object({
  taskId: z.uuid(),
  statusId: z.uuid(),
  beforeId: z.uuid().nullable(),
  afterId: z.uuid().nullable(),
})

export type BoardColumn = WorkflowStatus & { tasks: Task[] }

function toError(message: string): { ok: false; error: string } {
  return { ok: false, error: message }
}

/** Maps the RLS/constraint failures we expect into human sentences. */
function describeWriteError(error: { code?: string; message: string }) {
  if (error.code === '42501') {
    return toError('You have view-only access to this project, so you cannot change tasks.')
  }
  if (error.code === '23503') {
    return toError('That project or column no longer exists.')
  }
  return toError(error.message)
}

/**
 * The whole board in two queries: columns ordered by position, then every
 * non-archived top-level task in the project.
 *
 * Subtasks (parent_task_id not null) are excluded — they render inside their
 * parent's detail view from M3, not as their own cards.
 */
export async function getBoard(projectId: string): Promise<QueryResult<BoardColumn[]>> {
  const supabase = await createClient()

  const [statusesRes, tasksRes] = await Promise.all([
    supabase
      .from('workflow_statuses')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true }),
    supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .is('parent_task_id', null)
      .order('position', { ascending: true }),
  ])

  if (statusesRes.error) return toError(statusesRes.error.message)
  if (tasksRes.error) return toError(tasksRes.error.message)

  const tasks = tasksRes.data ?? []
  const columns = (statusesRes.data ?? []).map((status) => ({
    ...status,
    tasks: tasks.filter((task) => task.status_id === status.id),
  }))

  return { ok: true, data: columns }
}

/**
 * A single task by its human ref, scoped to its project.
 *
 * The project scope is required, not cosmetic: `ref` is unique per project
 * (`ref_unique_per_project`), so `OPS-1` alone can match rows in different
 * projects. See CLAUDE.md §8 issue #5.
 */
export async function getTaskByRef(
  projectId: string,
  ref: string,
): Promise<QueryResult<Task | null>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('ref', ref.toUpperCase())
    .maybeSingle()

  if (error) return toError(error.message)

  return { ok: true, data }
}

export async function createTask(input: unknown): Promise<QueryResult<Task>> {
  const parsed = createTaskSchema.safeParse(input)
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
  if (!user) return toError('You are not signed in.')

  // Land at the bottom of the target column.
  const { data: last, error: lastError } = await supabase
    .from('tasks')
    .select('position')
    .eq('status_id', parsed.data.statusId)
    .eq('is_archived', false)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastError) return toError(lastError.message)

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: parsed.data.projectId,
      status_id: parsed.data.statusId,
      title: parsed.data.title,
      work_type: parsed.data.workType,
      priority: parsed.data.priority,
      description: parsed.data.description || null,
      requested_by: parsed.data.requestedBy || null,
      source_note: parsed.data.sourceNote || null,
      position: (last?.position ?? 0) + POSITION_GAP,
      created_by: user.id,
      reporter_id: user.id,
      // `ref` is NOT NULL but assigned by the before-insert trigger; this
      // placeholder is overwritten and never reaches the row.
      ref: '',
    })
    .select()
    .single()

  if (error) return describeWriteError(error)

  return { ok: true, data }
}

export async function updateTask(input: unknown): Promise<QueryResult<Task>> {
  const parsed = updateTaskSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: parsed.data.title,
      work_type: parsed.data.workType,
      priority: parsed.data.priority,
      status_id: parsed.data.statusId,
      description: parsed.data.description || null,
      requested_by: parsed.data.requestedBy || null,
      source_note: parsed.data.sourceNote || null,
    })
    .eq('id', parsed.data.taskId)
    .select()
    .single()

  if (error) return describeWriteError(error)
  if (!data) return toError('That task no longer exists, or you cannot edit it.')

  return { ok: true, data }
}

export async function deleteTask(taskId: unknown): Promise<QueryResult<null>> {
  const parsed = z.uuid().safeParse(taskId)
  if (!parsed.success) return toError('Invalid task.')

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('tasks')
    .delete({ count: 'exact' })
    .eq('id', parsed.data)

  if (error) return describeWriteError(error)
  if (count === 0) {
    return toError('Nothing was deleted — you may have view-only access to this project.')
  }

  return { ok: true, data: null }
}

/**
 * Persists a drag: new column plus a position midway between its neighbours.
 *
 * Sparse positions (spec.md §4.3) mean only the dragged row is written — no
 * reindexing the column on every drop.
 */
export async function moveTask(input: unknown): Promise<QueryResult<Task>> {
  const parsed = moveTaskSchema.safeParse(input)
  if (!parsed.success) return toError('Invalid move.')

  const { taskId, statusId, beforeId, afterId } = parsed.data
  const supabase = await createClient()

  const neighbourIds = [beforeId, afterId].filter((id): id is string => id !== null)
  let beforePos: number | null = null
  let afterPos: number | null = null

  if (neighbourIds.length > 0) {
    const { data: neighbours, error } = await supabase
      .from('tasks')
      .select('id, position')
      .in('id', neighbourIds)

    if (error) return toError(error.message)

    beforePos = neighbours?.find((n) => n.id === beforeId)?.position ?? null
    afterPos = neighbours?.find((n) => n.id === afterId)?.position ?? null
  }

  let position: number
  if (beforePos !== null && afterPos !== null) {
    position = (beforePos + afterPos) / 2
  } else if (beforePos !== null) {
    position = beforePos + POSITION_GAP
  } else if (afterPos !== null) {
    position = afterPos / 2
  } else {
    position = POSITION_GAP
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ status_id: statusId, position })
    .eq('id', taskId)
    .select()
    .single()

  if (error) return describeWriteError(error)
  if (!data) return toError('That task no longer exists, or you cannot move it.')

  return { ok: true, data }
}
