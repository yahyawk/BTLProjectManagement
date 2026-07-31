import { notFound } from 'next/navigation'

import { canWriteProject } from '@/lib/queries/projects'
import { getBoard, getTaskByRef } from '@/lib/queries/tasks'
import type { Task } from '@/lib/types'
import { EditTaskForm } from './edit-task-form'

/**
 * Shared by the intercepted modal and the standalone page, so a deep link and
 * an in-app click render exactly the same content.
 */
export async function TaskDetail({
  projectId,
  taskRef,
}: {
  projectId: string
  taskRef: string
}) {
  const [taskResult, boardResult, canWrite] = await Promise.all([
    getTaskByRef(projectId, taskRef),
    getBoard(projectId),
    canWriteProject(projectId),
  ])

  if (!taskResult.ok) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load this task: {taskResult.error}
      </p>
    )
  }

  if (!taskResult.data) notFound()

  const task = taskResult.data
  const statuses = boardResult.ok
    ? boardResult.data.map(({ tasks: _tasks, ...status }) => status)
    : []
  const isAdhoc = task.work_type === 'adhoc'

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-medium text-slate-500">{task.ref}</span>
          <h2 className="text-lg font-semibold text-slate-900">{task.title}</h2>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            isAdhoc ? 'bg-adhoc/15 text-adhoc' : 'bg-recurring/15 text-recurring'
          }`}
        >
          {isAdhoc ? 'Ad-hoc' : 'Recurring'}
        </span>
      </div>

      {canWrite ? (
        <EditTaskForm projectId={projectId} task={task} statuses={statuses} />
      ) : (
        <ReadOnlyDetail task={task} />
      )}
    </div>
  )
}

function ReadOnlyDetail({ task }: { task: Task }) {
  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="text-slate-500">Priority</dt>
        <dd className="font-medium capitalize text-slate-900">{task.priority}</dd>
      </div>
      {task.description ? (
        <div>
          <dt className="text-slate-500">Description</dt>
          <dd className="whitespace-pre-wrap text-slate-900">{task.description}</dd>
        </div>
      ) : null}
      {task.requested_by ? (
        <div>
          <dt className="text-slate-500">Requested by</dt>
          <dd className="text-slate-900">{task.requested_by}</dd>
        </div>
      ) : null}
      <p className="pt-2 text-xs text-slate-500">You have view-only access to this project.</p>
    </dl>
  )
}
