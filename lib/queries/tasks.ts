import { z } from 'zod'

import { POSITION_GAP } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type {
  Label,
  PriorityLevel,
  QueryResult,
  Task,
  WorkflowStatus,
  WorkType,
} from '@/lib/types'

const WORK_TYPES = ['recurring', 'adhoc'] as const satisfies readonly WorkType[]
const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const satisfies readonly PriorityLevel[]

/** '' from an untouched form input means "not set", not an empty value. */
const optionalText = z.string().trim().optional().or(z.literal(''))

const optionalDate = z
  .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker')])
  .optional()

const optionalHours = z
  .union([
    z.literal(''),
    z.coerce
      .number({ message: 'Estimate must be a number' })
      .min(0, 'Estimate cannot be negative')
      .max(9999, 'Estimate looks too large'),
  ])
  .optional()

const optionalUuid = z.union([z.literal(''), z.uuid()]).optional()

/** Turns the form's empty strings into real NULLs for the database. */
function nullify<T extends string | number>(value: T | '' | undefined): T | null {
  return value === '' || value === undefined ? null : value
}

const taskFields = {
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must be 200 characters or fewer'),
  /**
   * No `.default()`, ever. spec.md §4.1 — if work_type can be skipped, the
   * workload and ad-hoc reports quietly stop meaning anything.
   */
  workType: z.enum(WORK_TYPES, { message: 'Choose whether this is recurring or ad-hoc' }),
  priority: z.enum(PRIORITIES),
  statusId: z.uuid('Pick a column'),
  assigneeId: optionalUuid,
  startDate: optionalDate,
  dueDate: optionalDate,
  estimateHours: optionalHours,
  description: optionalText,
  requestedBy: optionalText,
  sourceNote: optionalText,
}

export const createTaskSchema = z.object({
  projectId: z.uuid('Invalid project'),
  parentTaskId: optionalUuid,
  ...taskFields,
  priority: taskFields.priority.default('medium'),
})

export const updateTaskSchema = z.object({ taskId: z.uuid(), ...taskFields })

export const moveTaskSchema = z.object({
  taskId: z.uuid(),
  statusId: z.uuid(),
  beforeId: z.uuid().nullable(),
  afterId: z.uuid().nullable(),
})

export type BoardTask = Task & { labels: Label[] }
export type BoardColumn = WorkflowStatus & { tasks: BoardTask[] }

export type BoardFilters = {
  assigneeId?: string
  workType?: WorkType
  priority?: PriorityLevel
  labelId?: string
}

function toError(message: string): { ok: false; error: string } {
  return { ok: false, error: message }
}

function describeWriteError(error: { code?: string; message: string }) {
  if (error.code === '42501') {
    return toError('You have view-only access to this project, so you cannot change tasks.')
  }
  if (error.code === '23503') return toError('That project, column or person no longer exists.')
  if (error.code === '23514') {
    // due_after_start is the only CHECK a user can trip from the form.
    return toError('The due date cannot be before the start date.')
  }
  return toError(error.message)
}

const TASK_SELECT = '*, task_labels(labels(*))'

type TaskRow = Task & { task_labels: { labels: Label | null }[] | null }

function withLabels(row: TaskRow): BoardTask {
  const { task_labels, ...task } = row
  const labels = (task_labels ?? [])
    .map((join) => join.labels)
    .filter((label): label is Label => label !== null)
    .sort((a, b) => a.name.localeCompare(b.name))

  return { ...task, labels }
}

/**
 * The whole board: columns ordered by position, then every non-archived
 * top-level task, with labels attached.
 *
 * Subtasks are excluded — they render inside their parent's detail view, not
 * as their own cards.
 */
export async function getBoard(
  projectId: string,
  filters: BoardFilters = {},
): Promise<QueryResult<BoardColumn[]>> {
  const supabase = await createClient()

  let taskQuery = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('project_id', projectId)
    .eq('is_archived', false)
    .is('parent_task_id', null)
    .order('position', { ascending: true })

  if (filters.workType) taskQuery = taskQuery.eq('work_type', filters.workType)
  if (filters.priority) taskQuery = taskQuery.eq('priority', filters.priority)
  if (filters.assigneeId === 'unassigned') {
    taskQuery = taskQuery.is('assignee_id', null)
  } else if (filters.assigneeId) {
    taskQuery = taskQuery.eq('assignee_id', filters.assigneeId)
  }

  const [statusesRes, tasksRes] = await Promise.all([
    supabase
      .from('workflow_statuses')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true }),
    taskQuery,
  ])

  if (statusesRes.error) return toError(statusesRes.error.message)
  if (tasksRes.error) return toError(tasksRes.error.message)

  let tasks = ((tasksRes.data ?? []) as TaskRow[]).map(withLabels)

  // Label filtering happens here rather than in SQL: filtering a nested
  // embed would drop the other labels from the rows it keeps, and a board is
  // small enough that this costs nothing.
  if (filters.labelId) {
    tasks = tasks.filter((task) => task.labels.some((l) => l.id === filters.labelId))
  }

  const columns = (statusesRes.data ?? []).map((status) => ({
    ...status,
    tasks: tasks.filter((task) => task.status_id === status.id),
  }))

  return { ok: true, data: columns }
}

/**
 * A single task by its human ref, scoped to its project — `ref` is unique per
 * project, not globally (CLAUDE.md §8 issue #5).
 */
export async function getTaskByRef(
  projectId: string,
  ref: string,
): Promise<QueryResult<BoardTask | null>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('project_id', projectId)
    .eq('ref', ref.toUpperCase())
    .maybeSingle()

  if (error) return toError(error.message)
  if (!data) return { ok: true, data: null }

  return { ok: true, data: withLabels(data as TaskRow) }
}

/** One level of subtasks. The schema allows deeper nesting; the product does not. */
export async function listSubtasks(parentTaskId: string): Promise<QueryResult<Task[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('parent_task_id', parentTaskId)
    .eq('is_archived', false)
    .order('position', { ascending: true })

  if (error) return toError(error.message)

  return { ok: true, data: data ?? [] }
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

  const parentTaskId = nullify(parsed.data.parentTaskId)

  // Guard the one-level rule: you cannot nest under something already nested.
  if (parentTaskId) {
    const { data: parent, error: parentError } = await supabase
      .from('tasks')
      .select('parent_task_id')
      .eq('id', parentTaskId)
      .maybeSingle()

    if (parentError) return toError(parentError.message)
    if (!parent) return toError('That parent task no longer exists.')
    if (parent.parent_task_id) {
      return toError('Subtasks only go one level deep.')
    }
  }

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
      parent_task_id: parentTaskId,
      status_id: parsed.data.statusId,
      title: parsed.data.title,
      work_type: parsed.data.workType,
      priority: parsed.data.priority,
      assignee_id: nullify(parsed.data.assigneeId),
      start_date: nullify(parsed.data.startDate),
      due_date: nullify(parsed.data.dueDate),
      estimate_hours: nullify(parsed.data.estimateHours),
      description: nullify(parsed.data.description),
      requested_by: nullify(parsed.data.requestedBy),
      source_note: nullify(parsed.data.sourceNote),
      position: (last?.position ?? 0) + POSITION_GAP,
      created_by: user.id,
      reporter_id: user.id,
      // Overwritten by the before-insert trigger; never reaches the row.
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
      assignee_id: nullify(parsed.data.assigneeId),
      start_date: nullify(parsed.data.startDate),
      due_date: nullify(parsed.data.dueDate),
      estimate_hours: nullify(parsed.data.estimateHours),
      description: nullify(parsed.data.description),
      requested_by: nullify(parsed.data.requestedBy),
      source_note: nullify(parsed.data.sourceNote),
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
 * Only the dragged row is written — no reindexing (spec.md §4.3).
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
  if (beforePos !== null && afterPos !== null) position = (beforePos + afterPos) / 2
  else if (beforePos !== null) position = beforePos + POSITION_GAP
  else if (afterPos !== null) position = afterPos / 2
  else position = POSITION_GAP

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
