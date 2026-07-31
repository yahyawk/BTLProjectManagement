import Link from 'next/link'

import { Avatar, Chip, LabelChip, PriorityBadge, WorkTypeBadge } from '@/components/ui/badge'
import { IconAlert, IconClock } from '@/components/ui/icons'
import { formatDate, isOverdue } from '@/lib/dates'
import type { BoardTask } from '@/lib/queries/tasks'

/**
 * Ad-hoc work must be visually distinct from recurring everywhere it appears
 * (spec.md §5.2). Here that is a full-height accent spine down the left edge
 * plus the badge — colour alone is never the only signal, so the distinction
 * survives colour-blindness and greyscale printing.
 */
export function TaskCardBody({
  task,
  statusCategory,
  assigneeName,
  dragging = false,
}: {
  task: BoardTask
  statusCategory: string
  assigneeName?: string
  dragging?: boolean
}) {
  const isAdhoc = task.work_type === 'adhoc'
  const overdue = isOverdue(task.due_date, statusCategory)
  const done = statusCategory === 'done'

  return (
    <article
      className={`group relative overflow-hidden rounded-xl border bg-surface p-3 pl-4
                  transition-all duration-150
                  ${
                    dragging
                      ? 'border-accent/40 shadow-drag'
                      : 'border-line shadow-card hover:-translate-y-px hover:border-line-strong hover:shadow-pop'
                  }`}
    >
      {/* Accent spine: the work-type signal that survives at a glance. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${isAdhoc ? 'bg-adhoc' : 'bg-recurring'}`}
      />

      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] font-medium text-subtle">{task.ref}</span>
        <WorkTypeBadge workType={task.work_type} size="sm" />
      </div>

      <h3
        className={`mt-1.5 text-sm font-medium leading-snug ${
          done ? 'text-muted line-through' : 'text-fg'
        }`}
      >
        {task.title}
      </h3>

      {task.labels.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} />
          ))}
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />

        {task.due_date ? (
          <Chip tone={overdue ? 'danger' : 'neutral'} title={overdue ? 'Overdue' : 'Due date'}>
            {overdue ? <IconAlert className="size-3" /> : <IconClock className="size-3" />}
            {formatDate(task.due_date)}
          </Chip>
        ) : null}

        {task.estimate_hours !== null ? (
          <Chip title={`${task.estimate_hours} hours estimated`}>{task.estimate_hours}h</Chip>
        ) : null}

        {assigneeName ? (
          <span className="ml-auto">
            <Avatar name={assigneeName} seed={task.assignee_id ?? assigneeName} size="xs" />
          </span>
        ) : null}
      </div>

      {task.requested_by ? (
        <p className="mt-2 truncate border-t border-line pt-2 text-[11px] text-subtle">
          Requested by <span className="text-muted">{task.requested_by}</span>
        </p>
      ) : null}
    </article>
  )
}

export function TaskCardLink({
  task,
  projectId,
  statusCategory,
  assigneeName,
}: {
  task: BoardTask
  projectId: string
  statusCategory: string
  assigneeName?: string
}) {
  return (
    <Link href={`/projects/${projectId}/tasks/${task.ref}` as never} className="block rounded-xl">
      <TaskCardBody
        task={task}
        statusCategory={statusCategory}
        assigneeName={assigneeName}
      />
    </Link>
  )
}
