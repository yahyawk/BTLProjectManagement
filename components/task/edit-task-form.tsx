'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Field, FormError, SubmitButton } from '@/components/ui/field'
import { Notice } from '@/components/ui/panel'
import { SelectField } from '@/components/board/new-task-form'
import {
  deleteTaskAction,
  updateTaskAction,
  type TaskFormState,
} from '@/app/(app)/projects/[projectId]/actions'
import type { Task, WorkflowStatus, WorkType } from '@/lib/types'

export function EditTaskForm({
  projectId,
  task,
  statuses,
}: {
  projectId: string
  task: Task
  statuses: WorkflowStatus[]
}) {
  const [state, formAction] = useActionState<TaskFormState, FormData>(updateTaskAction, {})
  const [workType, setWorkType] = useState<WorkType>(task.work_type)

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="taskId" value={task.id} />
        <FormError message={state.error} />
        <Notice message={state.notice} />

        <Field
          label="Title"
          name="title"
          type="text"
          defaultValue={task.title}
          required
          errors={state.fieldErrors?.title}
        />

        <fieldset>
          <legend className="block text-sm font-medium text-slate-700">Work type</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(['recurring', 'adhoc'] as const).map((value) => {
              const checked = workType === value
              const selected =
                value === 'adhoc'
                  ? 'border-adhoc bg-adhoc/10 ring-2 ring-adhoc/30'
                  : 'border-recurring bg-recurring/10 ring-2 ring-recurring/30'
              return (
                <label
                  key={value}
                  className={`cursor-pointer rounded-lg border p-2.5 text-center text-sm font-medium transition ${
                    checked ? selected : 'border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="workType"
                    value={value}
                    checked={checked}
                    onChange={() => setWorkType(value)}
                    className="sr-only"
                  />
                  {value === 'adhoc' ? 'Ad-hoc' : 'Recurring'}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Column" name="statusId" defaultValue={task.status_id} required>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Priority" name="priority" defaultValue={task.priority}>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </SelectField>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={task.description ?? ''}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm
                       text-slate-900 focus:border-indigo-500 focus:outline-none
                       focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        {workType === 'adhoc' ? (
          <div className="space-y-4 rounded-lg border border-adhoc/30 bg-adhoc/5 p-3">
            <Field
              label="Requested by"
              name="requestedBy"
              type="text"
              defaultValue={task.requested_by ?? ''}
              errors={state.fieldErrors?.requestedBy}
            />
            <Field
              label="Source note"
              name="sourceNote"
              type="text"
              defaultValue={task.source_note ?? ''}
              errors={state.fieldErrors?.sourceNote}
            />
          </div>
        ) : null}

        <SubmitButton>Save changes</SubmitButton>
      </form>

      <DeleteTaskForm projectId={projectId} taskId={task.id} taskRef={task.ref} />
    </div>
  )
}

function DeleteTaskForm({
  projectId,
  taskId,
  taskRef,
}: {
  projectId: string
  taskId: string
  taskRef: string
}) {
  const [state, formAction] = useActionState<TaskFormState, FormData>(deleteTaskAction, {})
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // The task is gone, so the modal/page it lived in has nothing left to
    // show. Navigating in an effect, not during render.
    if (state.notice) router.replace(`/projects/${projectId}/board` as never)
  }, [state.notice, projectId, router])

  return (
    <div className="border-t border-slate-200 pt-4">
      <FormError message={state.error} />
      {confirming ? (
        <form action={formAction} className="flex items-center gap-3">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="taskId" value={taskId} />
          <p className="text-sm text-slate-700">Delete {taskRef} permanently?</p>
          <button
            type="submit"
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Delete task
        </button>
      )}
    </div>
  )
}
