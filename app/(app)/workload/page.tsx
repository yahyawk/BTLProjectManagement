import Link from 'next/link'

import { WorkloadGrid, WorkloadLegend } from '@/components/workload/workload-grid'
import { todayIso } from '@/lib/dates'
import { getWorkloadGrid } from '@/lib/queries/workload'
import { listMyWorkspaces } from '@/lib/queries/workspaces'

export const metadata = { title: 'Workload · Teamflow' }

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
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Create a workspace first — <Link href="/" className="text-indigo-600 hover:underline">go home</Link>.
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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Workload</h1>
          <p className="mt-1 text-sm text-slate-500">
            {active.name} · next {weeks} weeks
            {totalHours > 0 ? (
              <>
                {' '}
                · {Math.round((totals.adhoc / totalHours) * 100)}% of planned hours are
                unplanned work
              </>
            ) : null}
          </p>
        </div>
        <nav className="flex gap-1 rounded-md bg-slate-100 p-0.5" aria-label="Week range">
          {WEEK_OPTIONS.map((option) => (
            <Link
              key={option}
              href={{ pathname: '/workload', query: { ws: active.id, weeks: option } }}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                option === weeks
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {option}w
            </Link>
          ))}
        </nav>
      </header>

      {overCapacity.length > 0 ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <strong>
            {overCapacity.length} {overCapacity.length === 1 ? 'person is' : 'people are'} over
            capacity
          </strong>{' '}
          in at least one week: {overCapacity.map((r) => r.fullName).join(', ')}.
        </p>
      ) : null}

      <WorkloadLegend />
      <WorkloadGrid grid={grid} />

      <p className="text-xs text-slate-500">
        Capacity comes from each person&apos;s profile.{' '}
        <Link href="/profile" className="text-indigo-600 hover:underline">
          Edit yours
        </Link>
        .
      </p>
    </div>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      Could not load workload: {message}
    </p>
  )
}
