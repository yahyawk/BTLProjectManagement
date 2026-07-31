'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Field, FormError, SubmitButton } from '@/components/ui/field'
import { Notice } from '@/components/ui/panel'
import { CommonTaskFields, LabelPicker, WorkTypeChoice } from '@/components/board/task-fields'
import {
  deleteTaskAction,
  updateTaskAction,
  type TaskFormState,
} from '@/app/(app)/projects/[projectId]/actions'
import type { BoardTask } from '@/lib/queries/tasks'
import type { WorkspaceMemberRow } from '@/lib/queries/workspaces'
import type { Label, WorkflowStatus, WorkType } from '@/lib/types'

export function EditTaskForm({
  projectId,
  task,
  statuses,
  members,
  labels,
}: {
  projectId: string
  task: BoardTask
  statuses: WorkflowStatus[]
  members: WorkspaceMemberRow[]
  labels: Label[]
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

        <WorkTypeChoice
          value={workType}
          onChange={setWorkType}
          error={state.fieldErrors?.workType?.[0]}
        />

        <CommonTaskFields
          statuses={statuses}
          members={members}
          task={task}
          fieldErrors={state.fieldErrors}
        />

        <LabelPicker labels={labels} selectedIds={task.labels.map((l) => l.id)} />

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
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="taskId" value={taskId} />
          <p className="text-sm text-slate-700">
            Delete {taskRef} and its subtasks permanently?
          </p>
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
