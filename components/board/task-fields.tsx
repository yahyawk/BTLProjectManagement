'use client'

import { Field, SelectField } from '@/components/ui/field'
import { IconBolt, IconRepeat } from '@/components/ui/icons'
import type { WorkspaceMemberRow } from '@/lib/queries/workspaces'
import type { Label, Task, WorkflowStatus, WorkType } from '@/lib/types'

// Re-exported so existing imports keep working from one implementation.
export { SelectField }

/**
 * The required work-type choice.
 *
 * On create this renders with NO option selected — spec.md §5.2 says the user
 * must choose, so there is deliberately no `defaultChecked`, and the caller
 * keeps the submit button disabled until `value` is non-null.
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
      <legend className="text-xs font-medium text-muted">
        Work type <span className="text-danger">*</span>
      </legend>
      <p className="mt-1 text-xs text-subtle">
        No default — this is what the workload and ad-hoc reports slice by.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Option
          value="recurring"
          label="Recurring"
          hint="Predictable, scheduled"
          icon={<IconRepeat className="size-4" />}
          checked={value === 'recurring'}
          onSelect={onChange}
        />
        <Option
          value="adhoc"
          label="Ad-hoc"
          hint="An interrupt"
          icon={<IconBolt className="size-4" />}
          checked={value === 'adhoc'}
          onSelect={onChange}
        />
      </div>
      {error ? <p className="mt-1.5 text-xs font-medium text-danger">{error}</p> : null}
    </fieldset>
  )
}

function Option({
  value,
  label,
  hint,
  icon,
  checked,
  onSelect,
}: {
  value: WorkType
  label: string
  hint: string
  icon: React.ReactNode
  checked: boolean
  onSelect: (v: WorkType) => void
}) {
  // Written out in full: Tailwind extracts class names statically, so an
  // interpolated `border-${accent}` would never be generated.
  const selected =
    value === 'adhoc'
      ? 'border-adhoc bg-adhoc/10 text-adhoc ring-2 ring-adhoc/25'
      : 'border-recurring bg-recurring/10 text-recurring ring-2 ring-recurring/25'

  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3
                  transition-all duration-150 active:scale-[0.99]
                  ${checked ? selected : 'border-line text-muted hover:border-line-strong hover:bg-elevated'}`}
    >
      <input
        type="radio"
        name="workType"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${checked ? '' : 'text-fg'}`}>{label}</span>
        <span className="block text-xs text-subtle">{hint}</span>
      </span>
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
      <div className="grid gap-3 sm:grid-cols-2">
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

      <div className="grid gap-3 sm:grid-cols-2">
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

      <div className="grid gap-3 sm:grid-cols-2">
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
      <p className="text-xs text-subtle">
        No labels in this project yet — create some from the board or settings.
      </p>
    )
  }

  return (
    <fieldset>
      <legend className="text-xs font-medium text-muted">Labels</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {labels.map((label) => (
          <label
            key={label.id}
            className="cursor-pointer select-none rounded-lg border border-line px-2.5 py-1
                       text-xs font-medium text-muted transition-all duration-150
                       hover:border-line-strong hover:bg-elevated
                       has-[:checked]:border-accent has-[:checked]:bg-accent-soft
                       has-[:checked]:text-accent"
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
    </fieldset>
  )
}
