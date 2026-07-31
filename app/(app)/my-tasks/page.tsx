import Link from 'next/link'

import { formatDate } from '@/lib/dates'
import { getMyTasks, type MyTask, type MyTaskBuckets } from '@/lib/queries/tasks'

export const metadata = { title: 'My tasks · Teamflow' }

const GROUPS: {
  key: keyof MyTaskBuckets
  title: string
  tone: 'danger' | 'warn' | 'normal' | 'muted'
}[] = [
  { key: 'overdue', title: 'Overdue', tone: 'danger' },
  { key: 'today', title: 'Today', tone: 'warn' },
  { key: 'thisWeek', title: 'This week', tone: 'normal' },
  { key: 'later', title: 'Later', tone: 'normal' },
  { key: 'noDate', title: 'No due date', tone: 'muted' },
]

export default async function MyTasksPage() {
  const result = await getMyTasks()

  if (!result.ok) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load your tasks: {result.error}
      </p>
    )
  }

  const buckets = result.data
  const all = GROUPS.flatMap((g) => buckets[g.key])
  const adhoc = all.filter((t) => t.work_type === 'adhoc').length
  const hours = all.reduce((sum, t) => sum + (t.estimate_hours ?? 0), 0)

  if (all.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">My tasks</h1>
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Nothing is assigned to you right now. Tasks appear here as soon as someone puts
          your name on one.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">My tasks</h1>
        <p className="mt-1 text-sm text-slate-500">
          {all.length} open across every project · {hours}h estimated ·{' '}
          {Math.round((adhoc / all.length) * 100)}% unplanned
          {buckets.overdue.length > 0 ? (
            <>
              {' · '}
              <span className="font-medium text-red-600">
                {buckets.overdue.length} overdue
              </span>
            </>
          ) : null}
        </p>
      </header>

      {GROUPS.map((group) => {
        const tasks = buckets[group.key]
        if (tasks.length === 0) return null

        return (
          <section key={group.key} className="space-y-2">
            <h2
              className={`text-sm font-medium ${
                group.tone === 'danger'
                  ? 'text-red-700'
                  : group.tone === 'warn'
                    ? 'text-amber-700'
                    : group.tone === 'muted'
                      ? 'text-slate-500'
                      : 'text-slate-900'
              }`}
            >
              {group.title}{' '}
              <span className="font-normal text-slate-400">({tasks.length})</span>
            </h2>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {tasks.map((task) => (
                <MyTaskRow key={task.id} task={task} overdue={group.key === 'overdue'} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function MyTaskRow({ task, overdue }: { task: MyTask; overdue: boolean }) {
  const isAdhoc = task.work_type === 'adhoc'

  return (
    <li>
      <Link
        href={`/projects/${task.project_id}/tasks/${task.ref}` as never}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-slate-50"
      >
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full ${isAdhoc ? 'bg-adhoc' : 'bg-recurring'}`}
          title={isAdhoc ? 'Ad-hoc' : 'Recurring'}
        />
        <span
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600"
          title={task.project_name}
        >
          {task.ref}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{task.title}</span>

        {task.labels.slice(0, 2).map((label) => (
          <span
            key={label.id}
            className="hidden rounded px-1.5 py-0.5 text-[11px] font-medium text-white sm:inline"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
          </span>
        ))}

        <span className="shrink-0 text-xs text-slate-500">{task.status_name}</span>
        {task.estimate_hours !== null ? (
          <span className="shrink-0 text-xs text-slate-500">{task.estimate_hours}h</span>
        ) : null}
        {task.due_date ? (
          <span
            className={`shrink-0 text-xs font-medium ${
              overdue ? 'text-red-600' : 'text-slate-500'
            }`}
          >
            {formatDate(task.due_date)}
          </span>
        ) : null}
      </Link>
    </li>
  )
}
