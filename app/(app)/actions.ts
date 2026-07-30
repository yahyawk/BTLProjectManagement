'use server'

import { revalidatePath } from 'next/cache'

import { addMemberByEmail, createWorkspace } from '@/lib/queries/workspaces'
import { createProject } from '@/lib/queries/projects'

export type FormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  notice?: string
}

export async function createWorkspaceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await createWorkspace({ name: formData.get('name') })

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors }
  }

  revalidatePath('/')
  return { notice: `Workspace “${result.data.name}” created.` }
}

export async function createProjectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await createProject({
    workspaceId: formData.get('workspaceId'),
    name: formData.get('name'),
    key: formData.get('key'),
  })

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors }
  }

  revalidatePath('/')
  return { notice: `Project ${result.data.key} created with its four default columns.` }
}

export async function addMemberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = formData.get('email')
  const result = await addMemberByEmail({
    workspaceId: formData.get('workspaceId'),
    email,
    role: formData.get('role'),
  })

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors }
  }

  revalidatePath('/')
  return { notice: `${String(email)} added to the workspace.` }
}
