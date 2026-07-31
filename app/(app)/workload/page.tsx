import Link from 'next/link'

import { PageHeader, Stat } from '@/components/ui/panel'
import { WorkloadGrid, WorkloadLegend } from '@/components/workload/workload-grid'
import { todayIso } from '@/lib/dates'
import { getWorkloadGrid } from '@/lib/queries/workload'
import { listMyWorkspaces } from '@/lib/queries/workspaces'

export const metadata = { title: 'Workload' }

const WEEK_OPTIONS = [4, 6, 12]

export default async function WorkloadPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string; weeks?: string }>
}) {
  const { ws, weeks: weeksParam } = await searchParams
  const weeks = WEEK_OPTIONS.includes(Number(weeksParam)) ? Number(weeksParam) : 6

  const workspacesResult = await listMyWorkspaces()
  if (!workspacesResult.ok) {
    return <ErrorPanel message={workspacesResult.error} />
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
  const gridResult = await getWorkloadGrid(active.id, { from: todayIso(), weeks })

  if (!gridResult.ok) return <ErrorPanel message={gridResult.error} />

  const grid = gridResult.data
  const overCapacity = grid.rows.filter((row) =>
    row.cells.some((c) => row.capacityHours > 0 && c.plannedHours > row.capacityHours),
  )

  const totals = grid.rows.reduce(
    (acc, row) => {
      for (const cell of row.cells) {
        acc.recurring += cell.recurringHours
        acc.adhoc += cell.adhocHours
      }
      return acc
    },
    { recurring: 0, adhoc: 0 },
  )
  const totalHours = totals.recurring + totals.adhoc

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workload"
        subtitle={`${active.name} · next ${weeks} weeks`}
        actions={
          <nav className="flex gap-0.5 rounded-lg bg-elevated p-0.5" aria-label="Week range">
            {WEEK_OPTIONS.map((option) => (
              <Link
                key={option}
                href={{ pathname: '/workload', query: { ws: active.id, weeks: option } }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  option === weeks
                    ? 'bg-surface text-fg shadow-card'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {option}w
              </Link>
            ))}
          </nav>
        }
      />

      <div className="flex flex-wrap items-stretch gap-3">
        <Stat label="Recurring" value={`${totals.recurring}h`} accent="recurring" />
        <Stat label="Ad-hoc" value={`${totals.adhoc}h`} accent="adhoc" />
        <Stat
          label="Unplanned share"
          value={totalHours > 0 ? `${Math.round((totals.adhoc / totalHours) * 100)}%` : '—'}
          hint="Of all planned hours"
        />
        <Stat
          label="Over capacity"
          value={overCapacity.length}
          accent={overCapacity.length > 0 ? 'danger' : 'success'}
          hint={overCapacity.length > 0 ? 'People with a red week' : 'Everyone within capacity'}
        />
      </div>

      {overCapacity.length > 0 ? (
        <p className="animate-pop rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <strong>
            {overCapacity.length} {overCapacity.length === 1 ? 'person is' : 'people are'} over
            capacity
          </strong>{' '}
          in at least one week: {overCapacity.map((r) => r.fullName).join(', ')}.
        </p>
      ) : null}

      <WorkloadLegend />
      <WorkloadGrid grid={grid} />

      <p className="text-xs text-subtle">
        Capacity comes from each person&apos;s profile.{' '}
        <Link href="/profile" className="text-accent hover:underline">
          Edit yours
        </Link>
        .
      </p>
    </div>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
      Could not load workload: {message}
    </p>
  )
}
