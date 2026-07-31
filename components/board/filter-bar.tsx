import Link from 'next/link'
import type { Route } from 'next'

import { IconX } from '@/components/ui/icons'
import type { WorkspaceMemberRow } from '@/lib/queries/workspaces'
import type { Label } from '@/lib/types'

export type FilterValues = {
  assigneeId?: string
  workType?: string
  priority?: string
  labelId?: string
}

/**
 * Filters live in the URL, not component state — so a filtered board is
 * shareable, survives a refresh, and needs no client JS. Each control is a
 * plain link that rewrites one query param.
 */
export function FilterBar({
  basePath,
  filters,
  members,
  labels,
}: {
  basePath: string
  filters: FilterValues
  members: WorkspaceMemberRow[]
  labels: Label[]
}) {
  const active = Object.values(filters).filter(Boolean).length

  function hrefWith(patch: Partial<FilterValues>): Route {
    const next = { ...filters, ...patch }
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
    }
    const query = params.toString()
    return (query ? `${basePath}?${query}` : basePath) as Route
  }

  return (
    <div className="surface-card flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
      <Group label="Type">
        <Chip href={hrefWith({ workType: undefined })} active={!filters.workType}>
          All
        </Chip>
        <Chip
          href={hrefWith({ workType: 'recurring' })}
          active={filters.workType === 'recurring'}
          dot="recurring"
        >
          Recurring
        </Chip>
        <Chip
          href={hrefWith({ workType: 'adhoc' })}
          active={filters.workType === 'adhoc'}
          dot="adhoc"
        >
          Ad-hoc
        </Chip>
      </Group>

      <Group label="Priority">
        <Chip href={hrefWith({ priority: undefined })} active={!filters.priority}>
          Any
        </Chip>
        {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
          <Chip key={p} href={hrefWith({ priority: p })} active={filters.priority === p}>
            <span className="capitalize">{p}</span>
          </Chip>
        ))}
      </Group>

      <Group label="Assignee">
        <Chip href={hrefWith({ assigneeId: undefined })} active={!filters.assigneeId}>
          Anyone
        </Chip>
        <Chip
          href={hrefWith({ assigneeId: 'unassigned' })}
          active={filters.assigneeId === 'unassigned'}
        >
          Unassigned
        </Chip>
        {members.map((member) => (
          <Chip
            key={member.user_id}
            href={hrefWith({ assigneeId: member.user_id })}
            active={filters.assigneeId === member.user_id}
          >
            {member.full_name.split(' ')[0]}
          </Chip>
        ))}
      </Group>

      {labels.length > 0 ? (
        <Group label="Label">
          <Chip href={hrefWith({ labelId: undefined })} active={!filters.labelId}>
            Any
          </Chip>
          {labels.map((label) => (
            <Chip
              key={label.id}
              href={hrefWith({ labelId: label.id })}
              active={filters.labelId === label.id}
              color={label.color}
            >
              {label.name}
            </Chip>
          ))}
        </Group>
      ) : null}

      {active > 0 ? (
        <Link
          href={basePath as Route}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs
                     font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          <IconX className="size-3" />
          Clear {active}
        </Link>
      ) : null}
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-elevated p-0.5">
        {children}
      </div>
    </div>
  )
}

function Chip({
  href,
  active,
  dot,
  color,
  children,
}: {
  href: Route
  active: boolean
  dot?: 'recurring' | 'adhoc'
  color?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium
                  transition-all duration-150
                  ${active ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}
    >
      {dot === 'recurring' ? (
        <span aria-hidden className="size-1.5 rounded-full bg-recurring" />
      ) : dot === 'adhoc' ? (
        <span aria-hidden className="size-1.5 rounded-full bg-adhoc" />
      ) : color ? (
        <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      ) : null}
      {children}
    </Link>
  )
}
