import { IconCheck } from './icons'

export function Panel({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`surface-card overflow-hidden ${className}`}>
      {title ? (
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-fg">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Notice({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p
      role="status"
      className="flex animate-pop items-start gap-2 rounded-lg border border-success/30
                 bg-success/10 px-3 py-2 text-sm text-success"
    >
      <IconCheck className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  )
}

/** Page heading used at the top of every route, so titles line up everywhere. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle ? <div className="mt-1 text-sm text-muted">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="surface-card flex animate-rise flex-col items-center gap-3 border-dashed px-6 py-12 text-center">
      {icon ? (
        <span className="grid size-11 place-items-center rounded-full bg-elevated text-subtle">
          {icon}
        </span>
      ) : null}
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

/** Compact metric used in the strips above the board, workload and reports. */
export function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string
  value: React.ReactNode
  accent?: 'recurring' | 'adhoc' | 'danger' | 'success' | 'neutral'
  hint?: string
}) {
  // Written out in full — Tailwind extracts class names statically.
  const dot =
    accent === 'recurring'
      ? 'bg-recurring'
      : accent === 'adhoc'
        ? 'bg-adhoc'
        : accent === 'danger'
          ? 'bg-danger'
          : accent === 'success'
            ? 'bg-success'
            : 'bg-subtle'

  return (
    <div className="surface-card min-w-32 flex-1 px-4 py-3" title={hint}>
      <div className="flex items-center gap-1.5">
        {accent ? <span aria-hidden className={`size-2 rounded-full ${dot}`} /> : null}
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-fg">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-subtle">{hint}</p> : null}
    </div>
  )
}
