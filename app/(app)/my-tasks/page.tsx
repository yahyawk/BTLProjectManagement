import Link from 'next/link'

import { Chip, LabelChip, WorkTypeBadge } from '@/components/ui/badge'
import { IconInbox } from '@/components/ui/icons'
import { EmptyState, PageHeader, Stat } from '@/components/ui/panel'
import { formatDate } from '@/lib/dates'
import { getMyTasks, type MyTask, type MyTaskBuckets } from '@/lib/queries/tasks'

export const metadata = { title: 'My tasks' }

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
      <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
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
        <PageHeader title="My tasks" />
        <EmptyState
          icon={<IconInbox className="size-5" />}
          title="Nothing assigned to you"
          description="Tasks appear here as soon as someone puts your name on one."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My tasks" subtitle="Everything assigned to you, across every project." />

      <div className="flex flex-wrap items-stretch gap-3">
        <Stat label="Open" value={all.length} />
        <Stat label="Estimated" value={`${hours}h`} />
        <Stat
          label="Unplanned"
          value={`${Math.round((adhoc / all.length) * 100)}%`}
          accent="adhoc"
        />
        <Stat
          label="Overdue"
          value={buckets.overdue.length}
          accent={buckets.overdue.length > 0 ? 'danger' : 'success'}
        />
      </div>

      {GROUPS.map((group) => {
        const tasks = buckets[group.key]
        if (tasks.length === 0) return null

        return (
          <section key={group.key} className="space-y-2">
            <h2
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
                group.tone === 'danger'
                  ? 'text-danger'
                  : group.tone === 'warn'
                    ? 'text-warning'
                    : 'text-subtle'
              }`}
            >
              {group.title}
              <span className="rounded-md bg-elevated px-1.5 py-0.5 text-[10px] tabular-nums text-muted ring-1 ring-inset ring-line">
                {tasks.length}
              </span>
            </h2>
            <ul className="surface-card divide-y divide-[var(--border)]">
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
        className="group flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-elevated"
      >
        <span
          aria-hidden
          className={`h-8 w-1 shrink-0 rounded-full ${isAdhoc ? 'bg-adhoc' : 'bg-recurring'}`}
        />
        <span
          className="shrink-0 rounded-md bg-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted ring-1 ring-inset ring-line"
          title={task.project_name}
        >
          {task.ref}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{task.title}</span>

        <span className="hidden shrink-0 md:block">
          <WorkTypeBadge workType={task.work_type} size="sm" />
        </span>

        {task.labels.slice(0, 2).map((label) => (
          <span key={label.id} className="hidden shrink-0 lg:block">
            <LabelChip name={label.name} color={label.color} />
          </span>
        ))}

        <Chip>{task.status_name}</Chip>
        {task.estimate_hours !== null ? <Chip>{task.estimate_hours}h</Chip> : null}
        {task.due_date ? (
          <Chip tone={overdue ? 'danger' : 'neutral'}>{formatDate(task.due_date)}</Chip>
        ) : null}
      </Link>
    </li>
  )
}
