'use server'

import { revalidatePath } from 'next/cache'

import { createTask, deleteTask, moveTask, updateTask } from '@/lib/queries/tasks'

export type TaskFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  notice?: string
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}/board`)
}

export async function createTaskAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await createTask({
    projectId,
    statusId: formData.get('statusId'),
    title: formData.get('title'),
    // Deliberately passed through as-is: if no radio is checked this is null
    // and Zod rejects it. work_type must never acquire a default.
    workType: formData.get('workType'),
    priority: formData.get('priority') ?? 'medium',
    description: formData.get('description') ?? '',
    requestedBy: formData.get('requestedBy') ?? '',
    sourceNote: formData.get('sourceNote') ?? '',
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
    title: formData.get('title'),
    workType: formData.get('workType'),
    priority: formData.get('priority'),
    statusId: formData.get('statusId'),
    description: formData.get('description') ?? '',
    requestedBy: formData.get('requestedBy') ?? '',
    sourceNote: formData.get('sourceNote') ?? '',
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  revalidateProject(projectId)
  revalidatePath(`/projects/${projectId}/tasks/${result.data.ref}`)
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

/**
 * Called from the board after a drop. Returns a plain result rather than
 * throwing so the client can roll its optimistic state back.
 */
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
