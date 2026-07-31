import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { POSITION_GAP } from '@/lib/constants'
import { todayIso } from '@/lib/dates'
import {
  computeNextOccurrence,
  firstOccurrence,
  isDue,
  type RecurrenceRule,
} from '@/lib/recurrence'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'
import type { QueryResult, RecurrenceTemplate } from '@/lib/types'

type Client = SupabaseClient<Database>

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly'] as const
const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const

const optionalText = z.string().trim().optional().or(z.literal(''))
const optionalUuid = z.union([z.literal(''), z.uuid()]).optional()
const optionalDate = z
  .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker')])
  .optional()

function nullify<T extends string | number>(value: T | '' | undefined): T | null {
  return value === '' || value === undefined ? null : value
}

export const templateSchema = z
  .object({
    projectId: z.uuid('Invalid project'),
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(200, 'Title must be 200 characters or fewer'),
    description: optionalText,
    defaultAssigneeId: optionalUuid,
    priority: z.enum(PRIORITIES).default('medium'),
    estimateHours: z
      .union([z.literal(''), z.coerce.number().min(0, 'Cannot be negative').max(9999)])
      .optional(),

    frequency: z.enum(FREQUENCIES, { message: 'Pick a frequency' }),
    intervalCount: z.coerce
      .number()
      .int('Interval must be a whole number')
      .min(1, 'Interval must be at least 1')
      .max(52, 'Interval cannot exceed 52')
      .default(1),
    byweekday: z
      .array(z.coerce.number().int().min(1).max(7))
      .optional()
      .default([]),
    bymonthday: z
      .union([
        z.literal(''),
        z.coerce.number().int().min(-1).max(31),
      ])
      .optional(),

    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a start date'),
    endDate: optionalDate,
    leadTimeDays: z.coerce
      .number()
      .int()
      .min(0, 'Lead time cannot be negative')
      .max(90, 'Lead time cannot exceed 90 days')
      .default(3),
  })
  // Mirrors the `weekly_needs_weekdays` CHECK so the user gets a sentence
  // instead of a constraint violation.
  .refine((v) => v.frequency !== 'weekly' || v.byweekday.length > 0, {
    message: 'Pick at least one weekday',
    path: ['byweekday'],
  })
  // Mirrors `end_after_start`.
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: 'End date cannot be before the start date',
    path: ['endDate'],
  })

export type TemplateInput = z.infer<typeof templateSchema>

/** The subset of a template row the recurrence engine needs. */
export function ruleFromTemplate(t: {
  frequency: RecurrenceTemplate['frequency']
  interval_count: number
  byweekday: number[] | null
  bymonthday: number | null
  start_date: string
  end_date: string | null
}): RecurrenceRule {
  return {
    frequency: t.frequency,
    intervalCount: t.interval_count,
    byweekday: t.byweekday,
    bymonthday: t.bymonthday,
    startDate: t.start_date,
    endDate: t.end_date,
  }
}

function ruleFromInput(input: TemplateInput): RecurrenceRule {
  return {
    frequency: input.frequency,
    intervalCount: input.intervalCount,
    byweekday: input.byweekday,
    bymonthday: nullify(input.bymonthday),
    startDate: input.startDate,
    endDate: nullify(input.endDate),
  }
}

// --- CRUD -------------------------------------------------------------

export async function listTemplates(
  projectId: string,
): Promise<QueryResult<RecurrenceTemplate[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recurrence_templates')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: data ?? [] }
}

function describeWriteError(error: { code?: string; message: string }) {
  if (error.code === '42501') {
    return { ok: false as const, error: 'You have view-only access to this project.' }
  }
  return { ok: false as const, error: error.message }
}

export async function createTemplate(
  input: unknown,
): Promise<QueryResult<RecurrenceTemplate>> {
  const parsed = templateSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const rule = ruleFromInput(parsed.data)
  const next = firstOccurrence(rule)

  if (next === null) {
    return { ok: false, error: 'That schedule never produces an occurrence — check the dates.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You are not signed in.' }

  const { data, error } = await supabase
    .from('recurrence_templates')
    .insert({
      project_id: parsed.data.projectId,
      title: parsed.data.title,
      description: nullify(parsed.data.description),
      default_assignee_id: nullify(parsed.data.defaultAssigneeId),
      priority: parsed.data.priority,
      estimate_hours: nullify(parsed.data.estimateHours),
      frequency: parsed.data.frequency,
      interval_count: parsed.data.intervalCount,
      byweekday: parsed.data.frequency === 'weekly' ? parsed.data.byweekday : null,
      bymonthday: nullify(parsed.data.bymonthday),
      start_date: parsed.data.startDate,
      end_date: nullify(parsed.data.endDate),
      lead_time_days: parsed.data.leadTimeDays,
      // next_run_at holds the OCCURRENCE date (CLAUDE.md §8 issue #4).
      next_run_at: next,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return describeWriteError(error)

  return { ok: true, data }
}

export async function setTemplateActive(
  templateId: unknown,
  isActive: unknown,
): Promise<QueryResult<null>> {
  const parsedId = z.uuid().safeParse(templateId)
  const parsedActive = z.boolean().safeParse(isActive)
  if (!parsedId.success || !parsedActive.success) {
    return { ok: false, error: 'Invalid template.' }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('recurrence_templates')
    .update({ is_active: parsedActive.data }, { count: 'exact' })
    .eq('id', parsedId.data)

  if (error) return describeWriteError(error)
  if (count === 0) return { ok: false, error: 'You have view-only access to this project.' }

  return { ok: true, data: null }
}

/**
 * Pausing stops future generation but leaves existing tasks alone
 * (spec.md §5.1); deleting the template does too, because
 * `tasks.recurrence_template_id` is ON DELETE SET NULL.
 */
export async function deleteTemplate(templateId: unknown): Promise<QueryResult<null>> {
  const parsed = z.uuid().safeParse(templateId)
  if (!parsed.success) return { ok: false, error: 'Invalid template.' }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('recurrence_templates')
    .delete({ count: 'exact' })
    .eq('id', parsed.data)

  if (error) return describeWriteError(error)
  if (count === 0) return { ok: false, error: 'You have view-only access to this project.' }

  return { ok: true, data: null }
}

// --- The generator ----------------------------------------------------

export type GenerationSummary = {
  templatesConsidered: number
  created: { ref: string; title: string; dueDate: string }[]
  duplicatesSkipped: number
  exhausted: string[]
  errors: { template: string; message: string }[]
}

/**
 * Materialises due recurring tasks (spec.md §5.1).
 *
 * Takes the client as an argument rather than creating one, so the same logic
 * serves two callers with different authority:
 *   - the cron route, with a service-role client that sees every workspace
 *   - the "Run now" button, with the signed-in user's client, where RLS scopes
 *     it to their own projects
 *
 * Idempotency comes from `idx_recurrence_instance_unique` on
 * (recurrence_template_id, due_date): a second run in the same window hits the
 * unique index and is counted as skipped rather than duplicated.
 */
export async function generateRecurringTasks(
  supabase: Client,
  options: { today?: string; maxPerTemplate?: number } = {},
): Promise<GenerationSummary> {
  const today = options.today ?? todayIso()
  const maxPerTemplate = options.maxPerTemplate ?? 12

  const summary: GenerationSummary = {
    templatesConsidered: 0,
    created: [],
    duplicatesSkipped: 0,
    exhausted: [],
    errors: [],
  }

  const { data: templates, error } = await supabase
    .from('recurrence_templates')
    .select('*')
    .eq('is_active', true)

  if (error) {
    summary.errors.push({ template: '(query)', message: error.message })
    return summary
  }

  for (const template of templates ?? []) {
    summary.templatesConsidered += 1

    const rule = ruleFromTemplate(template)
    let nextRunAt: string | null = template.next_run_at
    let statusId: string | null = null
    let steps = 0

    // Catch up on every occurrence whose lead-time window has opened, not just
    // one — a cron that missed a few days should not silently drop tasks. The
    // cap stops a pathological template from flooding the board.
    while (nextRunAt && isDue(nextRunAt, template.lead_time_days, today) && steps < maxPerTemplate) {
      steps += 1

      if (statusId === null) {
        const { data: status, error: statusError } = await supabase
          .from('workflow_statuses')
          .select('id')
          .eq('project_id', template.project_id)
          .eq('category', 'todo')
          .order('position', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (statusError || !status) {
          summary.errors.push({
            template: template.title,
            message: statusError?.message ?? 'This project has no “todo” column to file into.',
          })
          break
        }
        statusId = status.id
      }

      const { data: last } = await supabase
        .from('tasks')
        .select('position')
        .eq('status_id', statusId)
        .eq('is_archived', false)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: inserted, error: insertError } = await supabase
        .from('tasks')
        .insert({
          project_id: template.project_id,
          status_id: statusId,
          title: template.title,
          description: template.description,
          // Generated work is recurring by construction.
          work_type: 'recurring',
          priority: template.priority,
          assignee_id: template.default_assignee_id,
          estimate_hours: template.estimate_hours,
          due_date: nextRunAt,
          recurrence_template_id: template.id,
          position: (last?.position ?? 0) + POSITION_GAP,
          created_by: template.created_by,
          reporter_id: template.created_by,
          // Overwritten by the before-insert trigger.
          ref: '',
        })
        .select('ref, title, due_date')
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          // The idempotency index did its job.
          summary.duplicatesSkipped += 1
        } else {
          summary.errors.push({ template: template.title, message: insertError.message })
          break
        }
      } else if (inserted) {
        summary.created.push({
          ref: inserted.ref,
          title: inserted.title,
          dueDate: inserted.due_date ?? nextRunAt,
        })
      }

      nextRunAt = computeNextOccurrence(rule, nextRunAt)
    }

    if (nextRunAt === null) {
      // The schedule ran past its end date. next_run_at is NOT NULL, so the
      // template is paused rather than left pointing at a stale date.
      const { error: pauseError } = await supabase
        .from('recurrence_templates')
        .update({ is_active: false })
        .eq('id', template.id)

      if (pauseError) {
        summary.errors.push({ template: template.title, message: pauseError.message })
      } else {
        summary.exhausted.push(template.title)
      }
    } else if (nextRunAt !== template.next_run_at) {
      const { error: advanceError } = await supabase
        .from('recurrence_templates')
        .update({ next_run_at: nextRunAt })
        .eq('id', template.id)

      if (advanceError) {
        summary.errors.push({ template: template.title, message: advanceError.message })
      }
    }
  }

  return summary
}

/** "Run now" from the UI — runs as the signed-in user, so RLS still applies. */
export async function runGeneratorAsUser(): Promise<QueryResult<GenerationSummary>> {
  const supabase = await createClient()
  return { ok: true, data: await generateRecurringTasks(supabase) }
}
