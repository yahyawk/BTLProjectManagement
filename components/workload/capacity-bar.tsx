import type { WorkloadCell } from '@/lib/queries/workload'

/**
 * One person-week: recurring and ad-hoc stacked, against a capacity line.
 *
 * The bar is scaled so the capacity line sits at a fixed fraction of the track
 * — that way the line is at the same height in every cell and a row can be
 * scanned across weeks. Load beyond the track is clipped visually, but the
 * number under the bar always tells the truth.
 */
export function CapacityBar({
  cell,
  capacityHours,
  index = 0,
}: {
  cell: WorkloadCell
  capacityHours: number
  index?: number
}) {
  const over = capacityHours > 0 && cell.plannedHours > capacityHours

  // Capacity sits at 72% of the track, leaving headroom to show overload.
  const scale = capacityHours > 0 ? 72 / capacityHours : 0
  const pct = (hours: number) => Math.min(hours * scale, 100)

  const recurringPct = pct(cell.recurringHours)
  const adhocPct = Math.min(pct(cell.recurringHours + cell.adhocHours) - recurringPct, 100)

  if (cell.plannedHours === 0) {
    return (
      <div className="flex h-[5.5rem] flex-col justify-end">
        <div className="relative h-[4.25rem] rounded-lg bg-sunken/60">
          <div
            className="absolute inset-x-0 border-t border-dashed border-line-strong"
            style={{ bottom: '72%' }}
          />
        </div>
        <span className="mt-1 block text-center text-[11px] text-subtle">—</span>
      </div>
    )
  }

  return (
    <div className="flex h-[5.5rem] flex-col justify-end">
      <div
        className={`group relative h-[4.25rem] overflow-hidden rounded-lg transition-colors ${
          over ? 'bg-danger/8' : 'bg-sunken/60'
        }`}
        title={`${cell.plannedHours}h planned of ${capacityHours}h · ${cell.recurringHours}h recurring · ${cell.adhocHours}h ad-hoc · ${cell.taskCount} tasks`}
      >
        {/* Stacked from the bottom: recurring first, ad-hoc on top. */}
        <div
          className="absolute inset-x-0 bottom-0 origin-bottom animate-grow rounded-t-[3px] bg-recurring"
          style={{ height: `${recurringPct}%`, animationDelay: `${index * 45}ms` }}
        />
        <div
          className="absolute inset-x-0 origin-bottom animate-grow rounded-t-[3px] bg-adhoc"
          style={{
            bottom: `${recurringPct}%`,
            height: `${adhocPct}%`,
            animationDelay: `${index * 45 + 60}ms`,
          }}
        />
        <div
          className={`absolute inset-x-0 border-t-2 border-dashed ${
            over ? 'border-danger' : 'border-line-strong'
          }`}
          style={{ bottom: '72%' }}
        />
      </div>
      <span
        className={`mt-1 block text-center text-[11px] font-semibold tabular-nums ${
          over ? 'text-danger' : 'text-muted'
        }`}
      >
        {cell.plannedHours}h
      </span>
    </div>
  )
}
