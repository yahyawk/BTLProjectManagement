import { formatDate } from '@/lib/dates'
import type { WorkloadGrid as Grid } from '@/lib/queries/workload'
import { CapacityBar } from './capacity-bar'

export function WorkloadGrid({ grid }: { grid: Grid }) {
  if (grid.rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No workspace members yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[48rem] border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-medium text-slate-500">
              Person
            </th>
            {grid.weeks.map((week, index) => (
              <th
                key={week}
                className="px-2 py-3 text-center text-xs font-medium text-slate-500"
              >
                {index === 0 ? 'This week' : formatDate(week)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => {
            const overWeeks = row.cells.filter(
              (c) => row.capacityHours > 0 && c.plannedHours > row.capacityHours,
            ).length

            return (
              <tr key={row.userId} className="border-b border-slate-100 last:border-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white px-4 py-3 text-left align-middle"
                >
                  <span className="block text-sm font-medium text-slate-900">
                    {row.fullName}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {row.capacityHours}h/week
                  </span>
                  {overWeeks > 0 ? (
                    <span className="mt-1 inline-block rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                      Over in {overWeeks} week{overWeeks === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </th>
                {row.cells.map((cell) => (
                  <td key={cell.weekStart} className="px-2 py-3 align-bottom">
                    <CapacityBar cell={cell} capacityHours={row.capacityHours} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function WorkloadLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-sm bg-recurring" /> Recurring
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-sm bg-adhoc" /> Ad-hoc
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="w-4 border-t-2 border-dashed border-slate-400" />
        Weekly capacity
      </span>
      <span className="text-slate-400">
        Hours come from each task&apos;s estimate, bucketed into the ISO week of its due
        date.
      </span>
    </div>
  )
}
