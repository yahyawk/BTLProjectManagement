import Link from 'next/link'

import type { PriorityLevel, Task } from '@/lib/types'

const priorityStyles: Record<PriorityLevel, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-slate-100 text-slate-600',
  low: 'bg-slate-100 text-slate-500',
}

/**
 * Ad-hoc work must be visually distinct from recurring everywhere it appears
 * (spec.md §5.2). The accent border + badge is that distinction; the colours
 * come from the `--color-adhoc` / `--color-recurring` tokens in globals.css.
 */
export function TaskCardBody({ task }: { task: Task }) {
  const isAdhoc = task.work_type === 'adhoc'

  return (
    <div
      className={`rounded-lg border border-slate-200 border-l-4 bg-white p-3 shadow-sm ${
        isAdhoc ? 'border-l-adhoc' : 'border-l-recurring'
      }`}
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

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${
            priorityStyles[task.priority]
          }`}
        >
          {task.priority}
        </span>
        {task.requested_by ? (
          <span className="truncate text-[11px] text-slate-500">
            from {task.requested_by}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** Non-draggable variant used for the drag overlay and view-only boards. */
export function TaskCardLink({
  task,
  projectId,
}: {
  task: Task
  projectId: string
}) {
  return (
    <Link
      href={`/projects/${projectId}/tasks/${task.ref}` as never}
      className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <TaskCardBody task={task} />
    </Link>
  )
}
