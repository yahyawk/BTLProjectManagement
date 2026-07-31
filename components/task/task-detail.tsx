import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Avatar, Chip, WorkTypeBadge } from '@/components/ui/badge'
import { Checklist } from '@/components/task/checklist'
import { TimeLog } from '@/components/task/time-log'
import { Comments } from '@/components/task/comments'
import { EditTaskForm } from '@/components/task/edit-task-form'
import { NewTaskForm } from '@/components/board/new-task-form'
import { formatDate, isOverdue } from '@/lib/dates'
import { listChecklist } from '@/lib/queries/checklist'
import { listComments } from '@/lib/queries/comments'
import { getTaskTime } from '@/lib/queries/time-entries'
import { listLabels } from '@/lib/queries/labels'
import { canWriteProject } from '@/lib/queries/projects'
import { createClient } from '@/lib/supabase/server'
import { getBoard, getTaskByRef, listSubtasks } from '@/lib/queries/tasks'
import { listProjectAssignees } from '@/lib/queries/workspaces'
import type { BoardTask } from '@/lib/queries/tasks'
import type { WorkspaceMemberRow } from '@/lib/queries/workspaces'
import type { Task, WorkflowStatus } from '@/lib/types'

/**
 * Shared by the intercepted modal and the standalone page, so a deep link and
 * an in-app click render exactly the same thing.
 */
export async function TaskDetail({
  projectId,
  taskRef,
}: {
  projectId: string
  taskRef: string
}) {
  const taskResult = await getTaskByRef(projectId, taskRef)

  if (!taskResult.ok) {
    return (
      <p className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Could not load this task: {taskResult.error}
      </p>
    )
  }
  if (!taskResult.data) notFound()

  const task = taskResult.data
  const supabase = await createClient()

  const [
    { data: auth },
    boardResult,
    membersResult,
    labelsResult,
    subtasksResult,
    checklistResult,
    commentsResult,
    timeResult,
    canWrite,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getBoard(projectId),
    listProjectAssignees(projectId),
    listLabels(projectId),
    listSubtasks(task.id),
    listChecklist(task.id),
    listComments(task.id),
    getTaskTime(task.id),
    canWriteProject(projectId),
  ])

  const columns = boardResult.ok ? boardResult.data : []
  const statuses = columns.map(({ tasks: _tasks, ...status }) => status)
  const category = columns.find((c) => c.id === task.status_id)?.category ?? 'todo'
  const members = membersResult.ok ? membersResult.data : []
  const labels = labelsResult.ok ? labelsResult.data : []
  const subtasks = subtasksResult.ok ? subtasksResult.data : []
  const checklist = checklistResult.ok ? checklistResult.data : []
  const comments = commentsResult.ok ? commentsResult.data : []
  const time = timeResult.ok
    ? timeResult.data
    : { entries: [], totalHours: 0, myHours: 0 }

  const overdue = isOverdue(task.due_date, category)
  const assignee = members.find((m) => m.user_id === task.assignee_id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pr-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted ring-1 ring-inset ring-line">
              {task.ref}
            </span>
            <WorkTypeBadge workType={task.work_type} size="sm" />
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-snug text-fg">{task.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {assignee ? (
              <span className="flex items-center gap-1.5">
                <Avatar name={assignee.full_name} seed={assignee.user_id} size="xs" />
                <span className="text-xs text-muted">{assignee.full_name}</span>
              </span>
            ) : (
              <Chip>Unassigned</Chip>
            )}
            {task.estimate_hours !== null ? <Chip>{task.estimate_hours}h estimate</Chip> : null}
            {task.due_date ? (
              <Chip tone={overdue ? 'danger' : 'neutral'}>
                {overdue ? 'Overdue — was due ' : 'Due '}
                {formatDate(task.due_date)}
              </Chip>
            ) : null}
          </div>
        </div>
      </div>

      {canWrite ? (
        <EditTaskForm
          projectId={projectId}
          task={task}
          statuses={statuses}
          members={members}
          labels={labels}
        />
      ) : (
        <ReadOnlyDetail task={task} />
      )}

      <Subtasks
        projectId={projectId}
        parent={task}
        subtasks={subtasks}
        statuses={statuses}
        members={members}
        canWrite={canWrite}
      />

      <Checklist
        projectId={projectId}
        taskId={task.id}
        items={checklist}
        canWrite={canWrite}
      />

      {auth.user ? (
        <TimeLog
          projectId={projectId}
          taskId={task.id}
          summary={time}
          estimateHours={task.estimate_hours}
          currentUserId={auth.user.id}
        />
      ) : null}

      {auth.user ? (
        <Comments
          projectId={projectId}
          taskId={task.id}
          comments={comments}
          currentUserId={auth.user.id}
        />
      ) : null}
    </div>
  )
}

function Subtasks({
  projectId,
  parent,
  subtasks,
  statuses,
  members,
  canWrite,
}: {
  projectId: string
  parent: BoardTask
  subtasks: Task[]
  statuses: WorkflowStatus[]
  members: WorkspaceMemberRow[]
  canWrite: boolean
}) {
  const done = subtasks.filter((s) => s.completed_at !== null).length

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Subtasks</h3>
        {subtasks.length > 0 ? (
          <span className="text-xs text-subtle">
            {done} / {subtasks.length} done
          </span>
        ) : null}
      </div>

      {subtasks.length > 0 ? (
        <ul className="space-y-1.5">
          {subtasks.map((subtask) => (
            <li key={subtask.id}>
              <Link
                href={`/projects/${projectId}/tasks/${subtask.ref}` as never}
                className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5
                           text-sm hover:bg-elevated"
              >
                <span
                  aria-hidden
                  className={`size-2 shrink-0 rounded-full ${
                    subtask.work_type === 'adhoc' ? 'bg-adhoc' : 'bg-recurring'
                  }`}
                />
                <span className="font-mono text-xs text-subtle">{subtask.ref}</span>
                <span
                  className={`min-w-0 flex-1 truncate ${
                    subtask.completed_at ? 'text-subtle line-through' : 'text-fg'
                  }`}
                >
                  {subtask.title}
                </span>
                {subtask.estimate_hours !== null ? (
                  <span className="shrink-0 text-xs text-subtle">
                    {subtask.estimate_hours}h
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-subtle">No subtasks.</p>
      )}

      {canWrite ? (
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted">
            Add a subtask
          </summary>
          <p className="mt-1 mb-3 text-xs text-subtle">
            Subtasks go one level deep only, and carry their own work type.
          </p>
          <NewTaskForm
            projectId={projectId}
            statuses={statuses}
            members={members}
            parentTaskId={parent.id}
            compact
          />
        </details>
      ) : null}
    </section>
  )
}

function ReadOnlyDetail({ task }: { task: BoardTask }) {
  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="text-subtle">Priority</dt>
        <dd className="font-medium capitalize text-fg">{task.priority}</dd>
      </div>
      {task.labels.length > 0 ? (
        <div>
          <dt className="text-subtle">Labels</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {task.labels.map((label) => (
              <span
                key={label.id}
                className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </dd>
        </div>
      ) : null}
      {task.description ? (
        <div>
          <dt className="text-subtle">Description</dt>
          <dd className="whitespace-pre-wrap text-fg">{task.description}</dd>
        </div>
      ) : null}
      {task.requested_by ? (
        <div>
          <dt className="text-subtle">Requested by</dt>
          <dd className="text-fg">{task.requested_by}</dd>
        </div>
      ) : null}
      {task.source_note ? (
        <div>
          <dt className="text-subtle">Source</dt>
          <dd className="text-fg">{task.source_note}</dd>
        </div>
      ) : null}
      <p className="pt-2 text-xs text-subtle">
        You have view-only access to this project, but you can still comment.
      </p>
    </dl>
  )
}
