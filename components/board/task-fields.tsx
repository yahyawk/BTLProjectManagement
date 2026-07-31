'use client'

import type { WorkspaceMemberRow } from '@/lib/queries/workspaces'
import type { Label, Task, WorkflowStatus, WorkType } from '@/lib/types'
import { Field } from '@/components/ui/field'

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

/**
 * The required work-type choice. Rendered with no option preselected on
 * create — spec.md §5.2 says the user must choose, so there is deliberately
 * no `defaultChecked` and the caller keeps the submit button disabled until
 * `value` is non-null.
 */
export function WorkTypeChoice({
  value,
  onChange,
  error,
}: {
  value: WorkType | null
  onChange: (v: WorkType) => void
  error?: string
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-slate-700">
        Work type <span className="text-red-600">*</span>
      </legend>
      <p className="mt-0.5 text-xs text-slate-500">
        No default. This is what the workload and ad-hoc reports slice by.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Option
          value="recurring"
          label="Recurring"
          hint="Predictable, scheduled"
          checked={value === 'recurring'}
          onSelect={onChange}
        />
        <Option
          value="adhoc"
          label="Ad-hoc"
          hint="An interrupt"
          checked={value === 'adhoc'}
          onSelect={onChange}
        />
      </div>
      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : null}
    </fieldset>
  )
}

function Option({
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

/** Column / priority / assignee / dates / estimate — identical on create and edit. */
export function CommonTaskFields({
  statuses,
  members,
  task,
  fieldErrors,
}: {
  statuses: WorkflowStatus[]
  members: WorkspaceMemberRow[]
  task?: Task
  fieldErrors?: Record<string, string[]>
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Column" name="statusId" defaultValue={task?.status_id} required>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Priority" name="priority" defaultValue={task?.priority ?? 'medium'}>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </SelectField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Assignee" name="assigneeId" defaultValue={task?.assignee_id ?? ''}>
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.full_name}
            </option>
          ))}
        </SelectField>
        <Field
          label="Estimate (hours)"
          name="estimateHours"
          type="number"
          min={0}
          step="0.25"
          placeholder="4"
          defaultValue={task?.estimate_hours ?? ''}
          errors={fieldErrors?.estimateHours}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Start date"
          name="startDate"
          type="date"
          defaultValue={task?.start_date ?? ''}
          errors={fieldErrors?.startDate}
        />
        <Field
          label="Due date"
          name="dueDate"
          type="date"
          defaultValue={task?.due_date ?? ''}
          errors={fieldErrors?.dueDate}
        />
      </div>
    </>
  )
}

export function LabelPicker({
  labels,
  selectedIds,
}: {
  labels: Label[]
  selectedIds: string[]
}) {
  if (labels.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No labels in this project yet — create some from the board.
      </p>
    )
  }

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-slate-700">Labels</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {labels.map((label) => (
          <label
            key={label.id}
            className="cursor-pointer select-none rounded-full border border-slate-300
                       px-2.5 py-1 text-xs font-medium text-slate-700 transition
                       hover:bg-slate-50 has-[:checked]:border-indigo-400
                       has-[:checked]:bg-indigo-50 has-[:checked]:ring-2
                       has-[:checked]:ring-indigo-200"
          >
            <input
              type="checkbox"
              name="labelIds"
              value={label.id}
              defaultChecked={selectedIds.includes(label.id)}
              className="sr-only"
            />
            <span
              aria-hidden
              className="mr-1.5 inline-block size-2 rounded-full align-middle"
              style={{ backgroundColor: label.color }}
            />
            {label.name}
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">Selected labels are saved with the task.</p>
    </fieldset>
  )
}
