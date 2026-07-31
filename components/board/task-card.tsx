import Link from 'next/link'

import { formatDate, isOverdue } from '@/lib/dates'
import type { BoardTask } from '@/lib/queries/tasks'
import type { PriorityLevel } from '@/lib/types'

const priorityStyles: Record<PriorityLevel, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-slate-100 text-slate-600',
  low: 'bg-slate-100 text-slate-500',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/**
 * Ad-hoc work must be visually distinct from recurring everywhere it appears
 * (spec.md §5.2) — hence the accent border and badge, coloured from the
 * `--color-adhoc` / `--color-recurring` tokens.
 */
export function TaskCardBody({
  task,
  statusCategory,
  assigneeName,
}: {
  task: BoardTask
  statusCategory: string
  assigneeName?: string
}) {
  const isAdhoc = task.work_type === 'adhoc'
  const overdue = isOverdue(task.due_date, statusCategory)

  return (
    <div
      className={`rounded-lg border border-l-4 bg-white p-3 shadow-sm ${
        isAdhoc ? 'border-l-adhoc' : 'border-l-recurring'
      } ${overdue ? 'border-red-300' : 'border-slate-200'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-medium text-slate-500">{task.ref}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            isAdhoc ? 'bg-adhoc/15 text-adhoc' : 'bg-recurring/15 text-recurring'
          }`}
        >
          {isAdhoc ? 'Ad-hoc' : 'Recurring'}
        </span>
      </div>

      <p className="mt-1.5 text-sm font-medium text-slate-900">{task.title}</p>

      {task.labels.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${
            priorityStyles[task.priority]
          }`}
        >
          {task.priority}
        </span>

        {task.due_date ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
              overdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
            }`}
            title={overdue ? 'Overdue' : 'Due date'}
          >
            {overdue ? 'Overdue · ' : ''}
            {formatDate(task.due_date)}
          </span>
        ) : null}

        {task.estimate_hours !== null ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
            {task.estimate_hours}h
          </span>
        ) : null}

        {assigneeName ? (
          <span
            className="ml-auto grid size-6 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700"
            title={assigneeName}
          >
            {initials(assigneeName)}
          </span>
        ) : null}
      </div>

      {task.requested_by ? (
        <p className="mt-1.5 truncate text-[11px] text-slate-500">from {task.requested_by}</p>
      ) : null}
    </div>
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
    <Link
      href={`/projects/${projectId}/tasks/${task.ref}` as never}
      className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <TaskCardBody task={task} statusCategory={statusCategory} assigneeName={assigneeName} />
    </Link>
  )
}
