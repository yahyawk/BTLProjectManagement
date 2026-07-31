'use client'

import { useActionState, useMemo, useState } from 'react'

import { Field, FormError, SubmitButton } from '@/components/ui/field'
import { Notice } from '@/components/ui/panel'
import { SelectField } from '@/components/board/task-fields'
import {
  createTemplateAction,
  type TemplateFormState,
} from '@/app/(app)/projects/[projectId]/recurring/actions'
import { todayIso, formatDate } from '@/lib/dates'
import { addDays, upcomingOccurrences, type RecurrenceRule } from '@/lib/recurrence'
import type { WorkspaceMemberRow } from '@/lib/queries/workspaces'

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

export function TemplateForm({
  projectId,
  members,
}: {
  projectId: string
  members: WorkspaceMemberRow[]
}) {
  const [state, formAction] = useActionState<TemplateFormState, FormData>(
    createTemplateAction,
    {},
  )

  const [frequency, setFrequency] = useState<RecurrenceRule['frequency']>('weekly')
  const [intervalCount, setIntervalCount] = useState(1)
  const [byweekday, setByweekday] = useState<number[]>([])
  const [bymonthday, setBymonthday] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState('')
  const [leadTimeDays, setLeadTimeDays] = useState(3)

  // Live preview using the same pure function the generator uses, so what the
  // form promises and what the cron produces cannot drift apart.
  const preview = useMemo(() => {
    if (!startDate) return []
    if (frequency === 'weekly' && byweekday.length === 0) return []

    const rule: RecurrenceRule = {
      frequency,
      intervalCount,
      byweekday,
      bymonthday: bymonthday === '' ? null : Number(bymonthday),
      startDate,
      endDate: endDate || null,
    }

    return upcomingOccurrences(rule, addDays(startDate, -1), 4)
  }, [frequency, intervalCount, byweekday, bymonthday, startDate, endDate])

  function toggleWeekday(day: number) {
    setByweekday((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <FormError message={state.error} />
      <Notice message={state.notice} />

      <Field
        label="Title"
        name="title"
        type="text"
        placeholder="Weekly ops report"
        required
        errors={state.fieldErrors?.title}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="frequency" className="block text-sm font-medium text-slate-700">
            Frequency
          </label>
          <select
            id="frequency"
            name="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurrenceRule['frequency'])}
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm
                       focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        <Field
          label={`Every N ${frequency === 'daily' ? 'days' : frequency === 'weekly' ? 'weeks' : frequency === 'monthly' ? 'months' : 'quarters'}`}
          name="intervalCount"
          type="number"
          min={1}
          max={52}
          value={intervalCount}
          onChange={(e) => setIntervalCount(Number(e.target.value) || 1)}
          errors={state.fieldErrors?.intervalCount}
        />
      </div>

      {frequency === 'weekly' ? (
        <fieldset>
          <legend className="block text-sm font-medium text-slate-700">On which days</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => (
              <label
                key={day.value}
                className="cursor-pointer select-none rounded-md border border-slate-300 px-2.5 py-1
                           text-xs font-medium text-slate-700 transition hover:bg-slate-50
                           has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50
                           has-[:checked]:text-indigo-700"
              >
                <input
                  type="checkbox"
                  name="byweekday"
                  value={day.value}
                  checked={byweekday.includes(day.value)}
                  onChange={() => toggleWeekday(day.value)}
                  className="sr-only"
                />
                {day.label}
              </label>
            ))}
          </div>
          {state.fieldErrors?.byweekday ? (
            <p className="mt-1.5 text-sm text-red-600">{state.fieldErrors.byweekday[0]}</p>
          ) : null}
        </fieldset>
      ) : null}

      {frequency === 'monthly' || frequency === 'quarterly' ? (
        <div className="space-y-1.5">
          <label htmlFor="bymonthday" className="block text-sm font-medium text-slate-700">
            Day of month
          </label>
          <select
            id="bymonthday"
            name="bymonthday"
            value={bymonthday}
            onChange={(e) => setBymonthday(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm
                       focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="">Same day as the start date</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            <option value="-1">Last day of the month</option>
          </select>
          <p className="text-xs text-slate-500">
            A day past the end of a short month clamps to its last day — the 31st becomes
            28 Feb, not 3 Mar.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Start date"
          name="startDate"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          errors={state.fieldErrors?.startDate}
        />
        <Field
          label="End date (optional)"
          name="endDate"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          errors={state.fieldErrors?.endDate}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Field
            label="Lead time (days)"
            name="leadTimeDays"
            type="number"
            min={0}
            max={90}
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(Number(e.target.value))}
            errors={state.fieldErrors?.leadTimeDays}
          />
          <p className="mt-1 text-xs text-slate-500">
            How far ahead the task appears. The Monday report can land the Thursday before.
          </p>
        </div>
        <Field
          label="Estimate (hours)"
          name="estimateHours"
          type="number"
          min={0}
          step="0.25"
          placeholder="2"
          errors={state.fieldErrors?.estimateHours}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Default assignee" name="defaultAssigneeId" defaultValue="">
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.full_name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Priority" name="priority" defaultValue="medium">
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </SelectField>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-700">Next occurrences</p>
        {preview.length > 0 ? (
          <>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {preview.map((date) => (
                <li
                  key={date}
                  className="rounded bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                >
                  {formatDate(date)}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              The first task will be created on{' '}
              <strong>{formatDate(addDays(preview[0], -leadTimeDays))}</strong>, {leadTimeDays}{' '}
              day{leadTimeDays === 1 ? '' : 's'} before it is due.
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-xs text-slate-500">
            {frequency === 'weekly' && byweekday.length === 0
              ? 'Pick at least one weekday.'
              : 'Set a start date.'}
          </p>
        )}
      </div>

      <SubmitButton>Create template</SubmitButton>
    </form>
  )
}
