'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button, Field, FormError, SubmitButton, TextareaField } from '@/components/ui/field'
import { Notice } from '@/components/ui/panel'
import { CommonTaskFields, LabelPicker, WorkTypeChoice } from '@/components/board/task-fields'
import { IconTrash } from '@/components/ui/icons'
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

        <TextareaField
          label="Description"
          name="description"
          rows={3}
          defaultValue={task.description ?? ''}
        />

        {workType === 'adhoc' ? (
          <div className="animate-rise space-y-3 rounded-xl border border-adhoc/30 bg-adhoc/8 p-3">
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
    <div className="border-t border-line pt-4">
      <FormError message={state.error} />
      {confirming ? (
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="taskId" value={taskId} />
          <p className="text-sm text-fg">Delete {taskRef} and its subtasks permanently?</p>
          <Button type="submit" variant="danger" size="sm">
            Delete
          </Button>
          <Button type="button" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-danger hover:underline"
        >
          <IconTrash className="size-4" />
          Delete task
        </button>
      )}
    </div>
  )
}
