export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-shimmer rounded-lg bg-elevated ${className}`} />
}

/** Mirrors the board's column layout so the page does not jump on load. */
export function BoardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 min-w-32 flex-1" />
        ))}
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }, (_, column) => (
          <div key={column} className="w-[19rem] shrink-0 rounded-xl border border-line bg-sunken/60 p-2.5">
            <Skeleton className="mb-2.5 h-4 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 3 - (column % 2) }, (_, card) => (
                <Skeleton key={card} className="h-28 w-full bg-surface" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-40" />
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 min-w-32 flex-1" />
        ))}
      </div>
      <div className="surface-card p-4">
        <div className="space-y-4">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-36 shrink-0" />
              {Array.from({ length: 6 }, (_, j) => (
                <Skeleton key={j} className="h-[5.5rem] flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
