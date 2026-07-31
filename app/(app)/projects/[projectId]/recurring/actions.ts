'use server'

import { revalidatePath } from 'next/cache'

import {
  createTemplate,
  deleteTemplate,
  runGeneratorAsUser,
  setTemplateActive,
  type GenerationSummary,
} from '@/lib/queries/recurrence'

export type TemplateFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  notice?: string
  summary?: GenerationSummary
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`, 'layout')
}

export async function createTemplateAction(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await createTemplate({
    projectId,
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    defaultAssigneeId: formData.get('defaultAssigneeId') ?? '',
    priority: formData.get('priority') ?? 'medium',
    estimateHours: formData.get('estimateHours') ?? '',
    frequency: formData.get('frequency'),
    intervalCount: formData.get('intervalCount') ?? 1,
    byweekday: formData.getAll('byweekday').map(String),
    bymonthday: formData.get('bymonthday') ?? '',
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate') ?? '',
    leadTimeDays: formData.get('leadTimeDays') ?? 3,
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  revalidateProject(projectId)
  return {
    notice: `“${result.data.title}” scheduled. First occurrence ${result.data.next_run_at}.`,
  }
}

export async function toggleTemplateAction(formData: FormData) {
  const projectId = String(formData.get('projectId') ?? '')
  await setTemplateActive(formData.get('templateId'), formData.get('isActive') === 'true')
  revalidateProject(projectId)
}

export async function deleteTemplateAction(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await deleteTemplate(formData.get('templateId'))
  if (!result.ok) return { error: result.error }

  revalidateProject(projectId)
  return { notice: 'Template deleted. Tasks it already created are untouched.' }
}

/**
 * Runs the same generator the cron route runs, but as the signed-in user, so
 * RLS scopes it to their own projects. Lets the milestone be verified without
 * handling CRON_SECRET.
 */
export async function runGeneratorAction(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const projectId = String(formData.get('projectId') ?? '')

  const result = await runGeneratorAsUser()
  if (!result.ok) return { error: result.error }

  revalidateProject(projectId)

  const { created, duplicatesSkipped } = result.data
  const notice =
    created.length > 0
      ? `Created ${created.length} task${created.length === 1 ? '' : 's'}: ${created
          .map((c) => c.ref)
          .join(', ')}.`
      : duplicatesSkipped > 0
        ? `Nothing new — ${duplicatesSkipped} occurrence${
            duplicatesSkipped === 1 ? '' : 's'
          } already existed.`
        : 'Nothing due right now.'

  return { notice, summary: result.data }
}
