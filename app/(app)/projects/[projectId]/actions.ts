'use server'

import { revalidatePath } from 'next/cache'

import {
  addChecklistItem,
  deleteChecklistItem,
  setChecklistItemDone,
} from '@/lib/queries/checklist'
import { addComment, deleteComment } from '@/lib/queries/comments'
import { createLabel, deleteLabel, setTaskLabels } from '@/lib/queries/labels'
import { createTask, deleteTask, moveTask, updateTask } from '@/lib/queries/tasks'
import { deleteTimeEntry, logTime } from '@/lib/queries/time-entries'

export type TaskFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  notice?: string
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`, 'layout')
}

/** Pulls the shared task fields out of a form in one place. */
function taskFieldsFrom(formData: FormData) {
  return {
    title: formData.get('title'),
    // Passed through as-is: with no radio checked this is null and Zod
    // rejects it. work_type must never acquire a default.
    workType: formData.get('workType'),
    priority: formData.get('priority') ?? 'medium',
    statusId: formData.get('statusId'),
    assigneeId: formData.get('assigneeId') ?? '',
    startDate: formData.get('startDate') ?? '',
    dueDate: formData.get('dueDate') ?? '',
    estimateHours: formData.get('estimateHours') ?? '',
    description: formData.get('description') ?? '',
    requestedBy: formData.get('requestedBy') ?? '',
    sourceNote: formData.get('sourceNote') ?? '',
  }
}

export async function createTaskAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await createTask({
    projectId,
    parentTaskId: formData.get('parentTaskId') ?? '',
    ...taskFieldsFrom(formData),
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  revalidateProject(projectId)
  return { notice: `${result.data.ref} created.` }
}

export async function updateTaskAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await updateTask({
    taskId: formData.get('taskId'),
    ...taskFieldsFrom(formData),
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  // Labels live in a join table, so they are a separate write.
  const labelResult = await setTaskLabels(
    formData.get('taskId'),
    formData.getAll('labelIds').map(String),
  )
  if (!labelResult.ok) return { error: labelResult.error }

  revalidateProject(projectId)
  return { notice: 'Saved.' }
}

export async function deleteTaskAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await deleteTask(formData.get('taskId'))
  if (!result.ok) return { error: result.error }

  revalidateProject(projectId)
  return { notice: 'Task deleted.' }
}

export async function moveTaskAction(input: {
  projectId: string
  taskId: string
  statusId: string
  beforeId: string | null
  afterId: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const result = await moveTask({
    taskId: input.taskId,
    statusId: input.statusId,
    beforeId: input.beforeId,
    afterId: input.afterId,
  })

  if (!result.ok) return { ok: false, error: result.error }

  revalidateProject(input.projectId)
  return { ok: true }
}

// --- Labels -----------------------------------------------------------

export async function createLabelAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await createLabel({
    projectId,
    name: formData.get('name'),
    color: formData.get('color') ?? '#64748b',
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  revalidateProject(projectId)
  return { notice: `Label “${result.data.name}” created.` }
}

export async function deleteLabelAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await deleteLabel(formData.get('labelId'))
  if (!result.ok) return { error: result.error }

  revalidateProject(projectId)
  return { notice: 'Label deleted.' }
}

// --- Checklist --------------------------------------------------------

export async function addChecklistItemAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await addChecklistItem({
    taskId: formData.get('taskId'),
    content: formData.get('content'),
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  revalidateProject(projectId)
  return {}
}

export async function toggleChecklistItemAction(formData: FormData) {
  const projectId = String(formData.get('projectId') ?? '')
  await setChecklistItemDone(formData.get('itemId'), formData.get('isDone') === 'true')
  revalidateProject(projectId)
}

export async function deleteChecklistItemAction(formData: FormData) {
  const projectId = String(formData.get('projectId') ?? '')
  await deleteChecklistItem(formData.get('itemId'))
  revalidateProject(projectId)
}

// --- Comments ---------------------------------------------------------

export async function addCommentAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await addComment({
    taskId: formData.get('taskId'),
    body: formData.get('body'),
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  revalidateProject(projectId)
  return {}
}

export async function deleteCommentAction(formData: FormData) {
  const projectId = String(formData.get('projectId') ?? '')
  await deleteComment(formData.get('commentId'))
  revalidateProject(projectId)
}

// --- Time entries -----------------------------------------------------

export async function logTimeAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await logTime({
    taskId: formData.get('taskId'),
    hours: formData.get('hours'),
    entryDate: formData.get('entryDate'),
    note: formData.get('note') ?? '',
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  revalidateProject(projectId)
  return {}
}

export async function deleteTimeEntryAction(formData: FormData) {
  const projectId = String(formData.get('projectId') ?? '')
  await deleteTimeEntry(formData.get('entryId'))
  revalidateProject(projectId)
}
