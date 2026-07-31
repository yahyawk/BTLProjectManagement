'use client'

import { useActionState, useState } from 'react'

import { Field, FormError, SubmitButton, TextareaField } from '@/components/ui/field'
import { Notice } from '@/components/ui/panel'
import { createTaskAction, type TaskFormState } from '@/app/(app)/projects/[projectId]/actions'
import type { WorkspaceMemberRow } from '@/lib/queries/workspaces'
import type { WorkflowStatus, WorkType } from '@/lib/types'
import { CommonTaskFields, WorkTypeChoice } from './task-fields'

export function NewTaskForm({
  projectId,
  statuses,
  members,
  parentTaskId,
  compact = false,
}: {
  projectId: string
  statuses: WorkflowStatus[]
  members: WorkspaceMemberRow[]
  /** Set when creating a subtask under an existing task. */
  parentTaskId?: string
  compact?: boolean
}) {
  const [state, formAction] = useActionState<TaskFormState, FormData>(createTaskAction, {})
  const [workType, setWorkType] = useState<WorkType | null>(null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      {parentTaskId ? <input type="hidden" name="parentTaskId" value={parentTaskId} /> : null}
      <FormError message={state.error} />
      <Notice message={state.notice} />

      <Field
        label="Title"
        name="title"
        type="text"
        placeholder={parentTaskId ? 'Draft the summary section' : 'Weekly ops report'}
        required
        errors={state.fieldErrors?.title}
      />

      <WorkTypeChoice
        value={workType}
        onChange={setWorkType}
        error={state.fieldErrors?.workType?.[0]}
      />

      <CommonTaskFields statuses={statuses} members={members} fieldErrors={state.fieldErrors} />

      {!compact ? (
        <TextareaField label="Description" name="description" rows={2} />
      ) : null}

      {workType === 'adhoc' ? (
        <div className="animate-rise space-y-3 rounded-xl border border-adhoc/30 bg-adhoc/8 p-3">
          <p className="text-xs text-muted">
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
        <SubmitButton>{parentTaskId ? 'Add subtask' : 'Create task'}</SubmitButton>
      </div>
      {workType === null ? (
        <p className="text-center text-xs text-subtle">Pick a work type to continue</p>
      ) : null}
    </form>
  )
}
