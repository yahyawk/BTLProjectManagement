'use client'

import { useActionState } from 'react'

import { FormError } from '@/components/ui/field'
import { Notice } from '@/components/ui/panel'
import {
  deleteTemplateAction,
  runGeneratorAction,
  toggleTemplateAction,
  type TemplateFormState,
} from '@/app/(app)/projects/[projectId]/recurring/actions'
import { formatDate } from '@/lib/dates'
import { addDays, upcomingOccurrences } from '@/lib/recurrence'
import type { RecurrenceTemplate } from '@/lib/types'

function describeSchedule(t: RecurrenceTemplate): string {
  const every = t.interval_count > 1 ? `every ${t.interval_count} ` : 'every '
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  switch (t.frequency) {
    case 'daily':
      return `${every}${t.interval_count > 1 ? 'days' : 'day'}`
    case 'weekly': {
      const names = (t.byweekday ?? []).map((d) => days[d - 1]).join(', ')
      return `${every}${t.interval_count > 1 ? 'weeks' : 'week'} on ${names || '—'}`
    }
    case 'monthly':
    case 'quarterly': {
      const day =
        t.bymonthday === -1
          ? 'the last day'
          : t.bymonthday
            ? `day ${t.bymonthday}`
            : 'the start date’s day'
      const unit = t.frequency === 'quarterly' ? 'quarter' : 'month'
      return `${every}${t.interval_count > 1 ? `${unit}s` : unit} on ${day}`
    }
    default:
      return t.frequency
  }
}

export function TemplateList({
  projectId,
  templates,
  canWrite,
}: {
  projectId: string
  templates: RecurrenceTemplate[]
  canWrite: boolean
}) {
  const [runState, runAction] = useActionState<TemplateFormState, FormData>(
    runGeneratorAction,
    {},
  )
  const [deleteState, deleteAction] = useActionState<TemplateFormState, FormData>(
    deleteTemplateAction,
    {},
  )

  return (
    <div className="space-y-4">
      {canWrite ? (
        <form action={runAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="projectId" value={projectId} />
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium
                       text-slate-700 transition hover:bg-slate-100"
          >
            Run generator now
          </button>
          <span className="text-xs text-slate-500">
            Same code the nightly cron runs. Safe to press twice — the second press
            creates nothing.
          </span>
        </form>
      ) : null}

      <Notice message={runState.notice} />
      <FormError message={runState.error} />
      <FormError message={deleteState.error} />
      <Notice message={deleteState.notice} />

      {runState.summary && runState.summary.errors.length > 0 ? (
        <ul className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {runState.summary.errors.map((e, i) => (
            <li key={i}>
              <strong>{e.template}:</strong> {e.message}
            </li>
          ))}
        </ul>
      ) : null}

      {templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No recurrence templates yet. Create one below and the generator will
          materialise real tasks from it.
        </p>
      ) : (
        <ul className="space-y-3">
          {templates.map((template) => {
            const preview = upcomingOccurrences(
              {
                frequency: template.frequency,
                intervalCount: template.interval_count,
                byweekday: template.byweekday,
                bymonthday: template.bymonthday,
                startDate: template.start_date,
                endDate: template.end_date,
              },
              addDays(template.next_run_at, -1),
              3,
            )

            return (
              <li
                key={template.id}
                className={`rounded-xl border bg-white p-4 ${
                  template.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-recurring/15 px-2 py-0.5 text-[11px] font-medium text-recurring">
                        Recurring
                      </span>
                      {!template.is_active ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          Paused
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-medium text-slate-900">{template.title}</p>
                    <p className="text-xs text-slate-500">
                      {describeSchedule(template)} · {template.lead_time_days}d lead
                      {template.estimate_hours !== null
                        ? ` · ${template.estimate_hours}h`
                        : ''}
                      {template.end_date ? ` · until ${formatDate(template.end_date)}` : ''}
                    </p>
                  </div>

                  {canWrite ? (
                    <div className="flex items-center gap-2">
                      <form action={toggleTemplateAction}>
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="templateId" value={template.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={template.is_active ? 'false' : 'true'}
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs
                                     font-medium text-slate-700 hover:bg-slate-100"
                        >
                          {template.is_active ? 'Pause' : 'Resume'}
                        </button>
                      </form>
                      <form action={deleteAction}>
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="templateId" value={template.id} />
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500">
                    Next due <strong>{formatDate(template.next_run_at)}</strong>
                    {template.is_active ? (
                      <>
                        {' '}
                        · will be created{' '}
                        <strong>
                          {formatDate(
                            addDays(template.next_run_at, -template.lead_time_days),
                          )}
                        </strong>
                      </>
                    ) : null}
                  </p>
                  {preview.length > 1 ? (
                    <p className="mt-1 text-xs text-slate-400">
                      then {preview.slice(1).map(formatDate).join(', ')}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
