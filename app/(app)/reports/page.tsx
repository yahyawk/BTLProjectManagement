import Link from 'next/link'

import { formatDate } from '@/lib/dates'
import { getAdhocTrend, getLoadByProject } from '@/lib/queries/reports'
import { listMyWorkspaces } from '@/lib/queries/workspaces'

export const metadata = { title: 'Reports · Teamflow' }

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string }>
}) {
  const { ws } = await searchParams
  const workspacesResult = await listMyWorkspaces()

  if (!workspacesResult.ok) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load reports: {workspacesResult.error}
      </p>
    )
  }

  const workspaces = workspacesResult.data
  if (workspaces.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Create a workspace first — <Link href="/" className="text-indigo-600 hover:underline">go home</Link>.
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
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          {active.name} ·{' '}
          {overall.created > 0 ? (
            <>
              <strong className="text-slate-700">{overallPct}%</strong> of all tasks created
              were unplanned
            </>
          ) : (
            'No tasks created yet'
          )}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-900">Ad-hoc ratio over time</h2>
        <p className="text-xs text-slate-500">
          Tasks created per ISO week, split by type. A rising orange share means interrupts
          are crowding out planned work.
        </p>

        {trend.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Nothing to chart yet — create a few tasks and come back.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex min-w-[32rem] items-end gap-3">
              {trend.map((point) => {
                const height = peak === 0 ? 0 : (point.tasksCreated / peak) * 100
                const adhocShare =
                  point.tasksCreated === 0
                    ? 0
                    : (point.adhocCreated / point.tasksCreated) * 100

                return (
                  <div key={point.weekStart} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      {point.adhocPct}%
                    </span>
                    <div
                      className="relative flex h-32 w-full items-end"
                      title={`${point.tasksCreated} created · ${point.adhocCreated} ad-hoc · ${point.recurringCreated} recurring`}
                    >
                      <div
                        className="relative w-full overflow-hidden rounded-t"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      >
                        <div className="absolute inset-0 bg-recurring" />
                        <div
                          className="absolute inset-x-0 top-0 bg-adhoc"
                          style={{ height: `${adhocShare}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(point.weekStart)}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded-sm bg-adhoc" /> Ad-hoc
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded-sm bg-recurring" /> Recurring
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-900">Open load by project</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-slate-500">No projects yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {projects.map((project) => {
              const adhocShare =
                project.plannedHours === 0
                  ? 0
                  : Math.round((project.adhocHours / project.plannedHours) * 100)

              return (
                <li key={project.projectId} className="flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-600">
                    {project.key}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-900">
                    {project.name}
                  </span>
                  <span className="shrink-0 text-sm text-slate-600">
                    {project.plannedHours}h open
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
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
