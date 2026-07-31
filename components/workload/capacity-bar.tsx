import type { WorkloadCell } from '@/lib/queries/workload'

/**
 * One person-week: recurring and ad-hoc stacked, against a capacity line.
 *
 * The bar is scaled so the capacity line sits at a fixed fraction of the
 * track — that way the line is at the same height in every cell and a row can
 * be scanned across weeks. Load beyond 125% of capacity is clipped visually
 * but the number always tells the truth.
 */
export function CapacityBar({
  cell,
  capacityHours,
}: {
  cell: WorkloadCell
  capacityHours: number
}) {
  const over = capacityHours > 0 && cell.plannedHours > capacityHours

  // Capacity sits at 80% of the track, leaving headroom to show overload.
  const scale = capacityHours > 0 ? 80 / capacityHours : 0
  const pct = (hours: number) => Math.min(hours * scale, 100)

  const recurringPct = pct(cell.recurringHours)
  const adhocPct = Math.min(pct(cell.recurringHours + cell.adhocHours) - recurringPct, 100)

  if (cell.plannedHours === 0) {
    return (
      <div className="flex h-20 flex-col justify-end">
        <div className="relative h-16 rounded bg-slate-50">
          <div
            className="absolute inset-x-0 border-t border-dashed border-slate-300"
            style={{ bottom: '80%' }}
          />
        </div>
        <span className="mt-1 block text-center text-[11px] text-slate-300">—</span>
      </div>
    )
  }

  return (
    <div className="flex h-20 flex-col justify-end">
      <div
        className={`relative h-16 overflow-hidden rounded ${over ? 'bg-red-50' : 'bg-slate-50'}`}
        title={`${cell.plannedHours}h planned of ${capacityHours}h · ${cell.recurringHours}h recurring · ${cell.adhocHours}h ad-hoc · ${cell.taskCount} tasks`}
      >
        {/* Stacked from the bottom: recurring first, then ad-hoc on top. */}
        <div
          className="absolute inset-x-0 bottom-0 bg-recurring"
          style={{ height: `${recurringPct}%` }}
        />
        <div
          className="absolute inset-x-0 bg-adhoc"
          style={{ bottom: `${recurringPct}%`, height: `${adhocPct}%` }}
        />
        {/* The capacity line. */}
        <div
          className={`absolute inset-x-0 border-t-2 border-dashed ${
            over ? 'border-red-500' : 'border-slate-400'
          }`}
          style={{ bottom: '80%' }}
        />
      </div>
      <span
        className={`mt-1 block text-center text-[11px] font-medium ${
          over ? 'text-red-600' : 'text-slate-500'
        }`}
      >
        {cell.plannedHours}h
        {over ? ' ⚠' : ''}
      </span>
    </div>
  )
}
