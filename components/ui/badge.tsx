import type { PriorityLevel, WorkType } from '@/lib/types'

/**
 * The work-type badge. Ad-hoc must be distinguishable from recurring wherever
 * it appears (spec.md §5.2), so this is the single place that decision lives.
 */
export function WorkTypeBadge({
  workType,
  size = 'md',
}: {
  workType: WorkType
  size?: 'sm' | 'md'
}) {
  const adhoc = workType === 'adhoc'
  const sizing = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset ${sizing} ${
        adhoc
          ? 'bg-adhoc/12 text-adhoc ring-adhoc/25'
          : 'bg-recurring/12 text-recurring ring-recurring/25'
      }`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${adhoc ? 'bg-adhoc' : 'bg-recurring'}`}
      />
      {adhoc ? 'Ad-hoc' : 'Recurring'}
    </span>
  )
}

const priorityStyles: Record<PriorityLevel, string> = {
  urgent: 'bg-danger/12 text-danger ring-danger/25',
  high: 'bg-warning/15 text-warning ring-warning/25',
  medium: 'bg-elevated text-muted ring-line',
  low: 'bg-elevated text-subtle ring-line',
}

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium
                  capitalize ring-1 ring-inset ${priorityStyles[priority]}`}
    >
      {priority}
    </span>
  )
}

export function Chip({
  children,
  tone = 'neutral',
  title,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'danger' | 'success' | 'accent'
  title?: string
}) {
  const tones = {
    neutral: 'bg-elevated text-muted ring-line',
    danger: 'bg-danger/12 text-danger ring-danger/25',
    success: 'bg-success/12 text-success ring-success/25',
    accent: 'bg-accent-soft text-accent ring-accent/25',
  }

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]
                  font-medium tabular-nums ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        // Tint derived from the stored hex so any label colour works.
        backgroundColor: `${color}22`,
        color,
        boxShadow: `inset 0 0 0 1px ${color}44`,
      }}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/** Deterministic hue per person, so the same face keeps the same colour. */
function hueFor(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 360
  return hash
}

export function Avatar({
  name,
  size = 'md',
  seed,
}: {
  name: string
  size?: 'xs' | 'sm' | 'md'
  seed?: string
}) {
  const sizing =
    size === 'xs' ? 'size-5 text-[9px]' : size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs'
  const hue = hueFor(seed ?? name)

  return (
    <span
      title={name}
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${sizing}`}
      style={{
        backgroundColor: `oklch(72% 0.11 ${hue} / 0.22)`,
        color: `oklch(58% 0.14 ${hue})`,
        boxShadow: `inset 0 0 0 1px oklch(65% 0.13 ${hue} / 0.35)`,
      }}
    >
      {initials(name)}
    </span>
  )
}
