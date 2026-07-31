import { Avatar } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'
import type { WorkloadGrid as Grid } from '@/lib/queries/workload'
import { CapacityBar } from './capacity-bar'

export function WorkloadGrid({ grid }: { grid: Grid }) {
  if (grid.rows.length === 0) {
    return (
      <p className="surface-card border-dashed px-6 py-12 text-center text-sm text-muted">
        No workspace members yet.
      </p>
    )
  }

  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle">
              Person
            </th>
            {grid.weeks.map((week, index) => (
              <th
                key={week}
                className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-subtle"
              >
                {index === 0 ? 'This week' : formatDate(week)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row, rowIndex) => {
            const overWeeks = row.cells.filter(
              (c) => row.capacityHours > 0 && c.plannedHours > row.capacityHours,
            ).length

            return (
              <tr key={row.userId} className="border-b border-line last:border-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface px-4 py-3 text-left align-middle"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.fullName} seed={row.userId} size="sm" />
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">
                        {row.fullName}
                      </span>
                      <span className="block text-[11px] tabular-nums text-subtle">
                        {row.capacityHours}h/week
                      </span>
                    </div>
                  </div>
                  {overWeeks > 0 ? (
                    <span className="mt-1.5 inline-block rounded-md bg-danger/12 px-1.5 py-0.5 text-[10px] font-medium text-danger ring-1 ring-inset ring-danger/25">
                      Over in {overWeeks} {overWeeks === 1 ? 'week' : 'weeks'}
                    </span>
                  ) : null}
                </th>
                {row.cells.map((cell, cellIndex) => (
                  <td key={cell.weekStart} className="px-2 py-3 align-bottom">
                    <CapacityBar
                      cell={cell}
                      capacityHours={row.capacityHours}
                      index={rowIndex * grid.weeks.length + cellIndex}
                    />
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
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-sm bg-recurring" /> Recurring
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-sm bg-adhoc" /> Ad-hoc
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="w-4 border-t-2 border-dashed border-line-strong" />
        Weekly capacity
      </span>
      <span className="text-subtle">
        Hours come from each task&apos;s estimate, bucketed into the ISO week of its due date.
      </span>
    </div>
  )
}
