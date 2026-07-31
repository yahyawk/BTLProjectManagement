import Link from 'next/link'

import { PageHeader, Stat } from '@/components/ui/panel'
import { formatDate } from '@/lib/dates'
import { getAdhocTrend, getLoadByProject } from '@/lib/queries/reports'
import { listMyWorkspaces } from '@/lib/queries/workspaces'

export const metadata = { title: 'Reports' }

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string }>
}) {
  const { ws } = await searchParams
  const workspacesResult = await listMyWorkspaces()

  if (!workspacesResult.ok) {
    return (
      <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Could not load reports: {workspacesResult.error}
      </p>
    )
  }

  const workspaces = workspacesResult.data
  if (workspaces.length === 0) {
    return (
      <p className="surface-card border-dashed px-6 py-12 text-center text-sm text-muted">
        Create a workspace first — <Link href="/" className="text-accent hover:underline">go home</Link>.
      </p>
    )
  }

  const active = workspaces.find((w) => w.id === ws) ?? workspaces[0]
  const [trendResult, loadResult] = await Promise.all([
    getAdhocTrend(active.id),
    getLoadByProject(active.id),
  ])

  const trend = trendResult.ok ? trendResult.data : []
  const projects = loadResult.ok ? loadResult.data : []

  const overall = trend.reduce(
    (acc, p) => ({ created: acc.created + p.tasksCreated, adhoc: acc.adhoc + p.adhocCreated }),
    { created: 0, adhoc: 0 },
  )
  const overallPct =
    overall.created === 0 ? 0 : Math.round((overall.adhoc / overall.created) * 100)
  const peak = trend.reduce<number>((max, p) => Math.max(max, p.tasksCreated), 0)

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle={active.name} />

      <div className="flex flex-wrap items-stretch gap-3">
        <Stat
          label="Unplanned share"
          value={overall.created > 0 ? `${overallPct}%` : '—'}
          accent="adhoc"
          hint="Of every task ever created"
        />
        <Stat label="Tasks created" value={overall.created} hint="All time" />
        <Stat label="Ad-hoc created" value={overall.adhoc} accent="adhoc" />
        <Stat
          label="Open hours"
          value={`${projects.reduce((s, p) => s + p.plannedHours, 0)}h`}
          hint="Across every project"
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle">
          Ad-hoc ratio over time
        </h2>
        <p className="text-xs text-muted">
          Tasks created per ISO week, split by type. A rising orange share means interrupts
          are crowding out planned work.
        </p>

        {trend.length === 0 ? (
          <p className="surface-card border-dashed px-6 py-12 text-center text-sm text-muted">
            Nothing to chart yet — create a few tasks and come back.
          </p>
        ) : (
          <div className="surface-card overflow-x-auto p-4">
            <div className="flex min-w-[32rem] items-end gap-3">
              {trend.map((point) => {
                const height = peak === 0 ? 0 : (point.tasksCreated / peak) * 100
                const adhocShare =
                  point.tasksCreated === 0
                    ? 0
                    : (point.adhocCreated / point.tasksCreated) * 100

                return (
                  <div key={point.weekStart} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[11px] font-semibold tabular-nums text-muted">
                      {point.adhocPct}%
                    </span>
                    <div
                      className="relative flex h-32 w-full items-end"
                      title={`${point.tasksCreated} created · ${point.adhocCreated} ad-hoc · ${point.recurringCreated} recurring`}
                    >
                      <div
                        className="relative w-full origin-bottom animate-grow overflow-hidden rounded-md
                                   transition-transform duration-150 hover:scale-x-105"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      >
                        <div className="absolute inset-0 bg-recurring" />
                        <div
                          className="absolute inset-x-0 top-0 bg-adhoc"
                          style={{ height: `${adhocShare}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-subtle">{formatDate(point.weekStart)}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex gap-4 border-t border-line pt-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-sm bg-adhoc" /> Ad-hoc
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-sm bg-recurring" /> Recurring
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle">
          Open load by project
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted">No projects yet.</p>
        ) : (
          <ul className="surface-card divide-y divide-[var(--border)]">
            {projects.map((project) => {
              const adhocShare =
                project.plannedHours === 0
                  ? 0
                  : Math.round((project.adhocHours / project.plannedHours) * 100)

              return (
                <li
                  key={project.projectId}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated"
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="rounded-md bg-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted ring-1 ring-inset ring-line">
                    {project.key}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                    {project.name}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">
                    {project.plannedHours}h
                  </span>
                  <span className="hidden shrink-0 text-xs tabular-nums text-subtle sm:block">
                    {adhocShare}% ad-hoc · {project.taskCount} tasks
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
