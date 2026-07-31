'use client'

import { useActionState, useRef } from 'react'

import { Field, FormError } from '@/components/ui/field'
import {
  deleteTimeEntryAction,
  logTimeAction,
  type TaskFormState,
} from '@/app/(app)/projects/[projectId]/actions'
import { formatDate, todayIso } from '@/lib/dates'
import type { TaskTimeSummary } from '@/lib/queries/time-entries'

/**
 * Actual-vs-estimate (spec.md §8 M6). The estimate drives Workload; logged
 * hours are what actually happened, so the gap between them is the interesting
 * number — shown as an over/under rather than just two figures.
 */
export function TimeLog({
  projectId,
  taskId,
  summary,
  estimateHours,
  currentUserId,
}: {
  projectId: string
  taskId: string
  summary: TaskTimeSummary
  estimateHours: number | null
  currentUserId: string
}) {
  const [state, formAction] = useActionState<TaskFormState, FormData>(logTimeAction, {})
  const formRef = useRef<HTMLFormElement>(null)

  const logged = summary.totalHours
  const over = estimateHours !== null && logged > estimateHours
  const pct =
    estimateHours && estimateHours > 0 ? Math.min((logged / estimateHours) * 100, 100) : 0

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-900">Time</h3>
        <span className="text-xs text-slate-500">
          {logged}h logged
          {estimateHours !== null ? ` of ${estimateHours}h estimated` : ' · no estimate'}
        </span>
      </div>

      {estimateHours !== null && estimateHours > 0 ? (
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
                over ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(pct, logged > 0 ? 4 : 0)}%` }}
            />
          </div>
          <p className={`mt-1 text-xs ${over ? 'text-red-600' : 'text-slate-500'}`}>
            {over
              ? `${Math.round((logged - estimateHours) * 100) / 100}h over estimate`
              : `${Math.round((estimateHours - logged) * 100) / 100}h remaining`}
          </p>
        </div>
      ) : null}

      {summary.entries.length > 0 ? (
        <ul className="space-y-1">
          {summary.entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-sm"
            >
              <span className="w-12 shrink-0 font-medium text-slate-900">{entry.hours}h</span>
              <span className="w-14 shrink-0 text-xs text-slate-500">
                {formatDate(entry.entryDate)}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                {entry.userName}
                {entry.note ? ` — ${entry.note}` : ''}
              </span>
              {entry.userId === currentUserId ? (
                <form action={deleteTimeEntryAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="entryId" value={entry.id} />
                  <button
                    type="submit"
                    aria-label="Delete entry"
                    className="rounded px-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  >
                    ✕
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">No time logged yet.</p>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData)
          formRef.current?.reset()
        }}
        className="grid grid-cols-[5rem_9rem_1fr_auto] items-end gap-2"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="taskId" value={taskId} />
        <Field
          label="Hours"
          name="hours"
          type="number"
          min={0.25}
          max={24}
          step="0.25"
          placeholder="2"
          required
          errors={state.fieldErrors?.hours}
        />
        <Field
          label="Date"
          name="entryDate"
          type="date"
          defaultValue={todayIso()}
          required
          errors={state.fieldErrors?.entryDate}
        />
        <Field label="Note" name="note" type="text" placeholder="Optional" />
        <button
          type="submit"
          className="h-[38px] rounded-md border border-slate-300 px-3 text-sm font-medium
                     text-slate-700 hover:bg-slate-100"
        >
          Log
        </button>
      </form>
      <FormError message={state.error} />
    </section>
  )
}
