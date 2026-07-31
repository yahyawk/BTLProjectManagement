export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
}

/** Mirrors the board's column layout so the page does not jump on load. */
export function BoardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-11 w-full" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }, (_, column) => (
          <div key={column} className="w-72 shrink-0 rounded-xl bg-slate-100/70 p-3">
            <Skeleton className="mb-3 h-4 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 3 - (column % 2) }, (_, card) => (
                <Skeleton key={card} className="h-24 w-full bg-white" />
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
      <Skeleton className="h-6 w-40" />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="space-y-4">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-32" />
              {Array.from({ length: 6 }, (_, j) => (
                <Skeleton key={j} className="h-16 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
