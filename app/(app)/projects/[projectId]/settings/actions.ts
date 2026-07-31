'use server'

import { revalidatePath } from 'next/cache'

import { updateProject } from '@/lib/queries/projects'
import {
  createStatus,
  deleteStatus,
  moveStatus,
  updateStatus,
} from '@/lib/queries/statuses'

export type SettingsFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  notice?: string
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`, 'layout')
}

export async function updateProjectAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await updateProject({
    projectId,
    name: formData.get('name'),
    key: formData.get('key'),
    description: formData.get('description') ?? '',
    state: formData.get('state') ?? 'active',
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  revalidateProject(projectId)
  revalidatePath('/')
  return {
    notice: `Saved. New tasks will be numbered ${result.data.key}-…; existing refs keep their original prefix.`,
  }
}

export async function createStatusAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await createStatus({
    projectId,
    name: formData.get('name'),
    category: formData.get('category'),
    wipLimit: formData.get('wipLimit') ?? '',
    color: formData.get('color') ?? '#94a3b8',
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  revalidateProject(projectId)
  return { notice: `Column “${result.data.name}” added.` }
}

export async function updateStatusAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await updateStatus({
    statusId: formData.get('statusId'),
    name: formData.get('name'),
    category: formData.get('category'),
    wipLimit: formData.get('wipLimit') ?? '',
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  revalidateProject(projectId)
  return { notice: 'Column updated.' }
}

export async function moveStatusAction(formData: FormData) {
  const projectId = String(formData.get('projectId') ?? '')
  await moveStatus(formData.get('statusId'), formData.get('direction'))
  revalidateProject(projectId)
}

export async function deleteStatusAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await deleteStatus(formData.get('statusId'))
  if (!result.ok) return { error: result.error }

  revalidateProject(projectId)
  return { notice: 'Column deleted.' }
}
