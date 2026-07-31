'use client'

import { useActionState, useState } from 'react'

import { Field, FormError, SubmitButton } from '@/components/ui/field'
import { Notice } from '@/components/ui/panel'
import { createTaskAction, type TaskFormState } from '@/app/(app)/projects/[projectId]/actions'
import type { WorkflowStatus, WorkType } from '@/lib/types'

/**
 * `work_type` is a required choice with NO preselected radio — spec.md §5.2.
 * Adding a `defaultChecked` here would quietly undo the whole premise of the
 * app, so the submit button stays disabled until the user picks one.
 */
export function NewTaskForm({
  projectId,
  statuses,
}: {
  projectId: string
  statuses: WorkflowStatus[]
}) {
  const [state, formAction] = useActionState<TaskFormState, FormData>(createTaskAction, {})
  const [workType, setWorkType] = useState<WorkType | null>(null)

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

      <fieldset>
        <legend className="block text-sm font-medium text-slate-700">
          Work type <span className="text-red-600">*</span>
        </legend>
        <p className="mt-0.5 text-xs text-slate-500">
          There is no default. This is what the workload and ad-hoc reports slice by.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <WorkTypeOption
            value="recurring"
            label="Recurring"
            hint="Predictable, scheduled"
            checked={workType === 'recurring'}
            onSelect={setWorkType}
          />
          <WorkTypeOption
            value="adhoc"
            label="Ad-hoc"
            hint="An interrupt"
            checked={workType === 'adhoc'}
            onSelect={setWorkType}
          />
        </div>
        {state.fieldErrors?.workType ? (
          <p className="mt-1.5 text-sm text-red-600">{state.fieldErrors.workType[0]}</p>
        ) : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Column" name="statusId" required>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
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

      {workType === 'adhoc' ? (
        <div className="space-y-4 rounded-lg border border-adhoc/30 bg-adhoc/5 p-3">
          <p className="text-xs text-slate-600">
            Where did this interrupt come from? This is what makes the ad-hoc report
            actionable.
          </p>
          <Field
            label="Requested by"
            name="requestedBy"
            type="text"
            placeholder="Sales — Priya"
            errors={state.fieldErrors?.requestedBy}
          />
          <Field
            label="Source note"
            name="sourceNote"
            type="text"
            placeholder="Customer escalation from the Acme account review"
            errors={state.fieldErrors?.sourceNote}
          />
        </div>
      ) : null}

      <div className={workType === null ? 'pointer-events-none opacity-50' : undefined}>
        <SubmitButton>Create task</SubmitButton>
      </div>
      {workType === null ? (
        <p className="text-center text-xs text-slate-500">Pick a work type to continue</p>
      ) : null}
    </form>
  )
}

function WorkTypeOption({
  value,
  label,
  hint,
  checked,
  onSelect,
}: {
  value: WorkType
  label: string
  hint: string
  checked: boolean
  onSelect: (v: WorkType) => void
}) {
  // Written out in full: Tailwind extracts class names statically, so an
  // interpolated `border-${accent}` would never be generated.
  const selected =
    value === 'adhoc'
      ? 'border-adhoc bg-adhoc/10 ring-2 ring-adhoc/30'
      : 'border-recurring bg-recurring/10 ring-2 ring-recurring/30'

  return (
    <label
      className={`cursor-pointer rounded-lg border p-3 transition ${
        checked ? selected : 'border-slate-300 hover:bg-slate-50'
      }`}
    >
      <input
        type="radio"
        name="workType"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span className="block text-sm font-medium text-slate-900">{label}</span>
      <span className="block text-xs text-slate-500">{hint}</span>
    </label>
  )
}

export function SelectField({
  label,
  name,
  children,
  defaultValue,
  required,
}: {
  label: string
  name: string
  children: React.ReactNode
  defaultValue?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm
                   text-slate-900 focus:border-indigo-500 focus:outline-none
                   focus:ring-2 focus:ring-indigo-500/30"
      >
        {children}
      </select>
    </div>
  )
}
