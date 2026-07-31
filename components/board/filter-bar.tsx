import Link from 'next/link'
import type { Route } from 'next'

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
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="text-xs font-medium text-slate-500">Filter</span>

      <FilterGroup label="Type">
        <FilterChip href={hrefWith({ workType: undefined })} active={!filters.workType}>
          All
        </FilterChip>
        <FilterChip href={hrefWith({ workType: 'recurring' })} active={filters.workType === 'recurring'}>
          Recurring
        </FilterChip>
        <FilterChip href={hrefWith({ workType: 'adhoc' })} active={filters.workType === 'adhoc'}>
          Ad-hoc
        </FilterChip>
      </FilterGroup>

      <FilterGroup label="Priority">
        <FilterChip href={hrefWith({ priority: undefined })} active={!filters.priority}>
          Any
        </FilterChip>
        {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
          <FilterChip key={p} href={hrefWith({ priority: p })} active={filters.priority === p}>
            <span className="capitalize">{p}</span>
          </FilterChip>
        ))}
      </FilterGroup>

      <FilterGroup label="Assignee">
        <FilterChip href={hrefWith({ assigneeId: undefined })} active={!filters.assigneeId}>
          Anyone
        </FilterChip>
        <FilterChip
          href={hrefWith({ assigneeId: 'unassigned' })}
          active={filters.assigneeId === 'unassigned'}
        >
          Unassigned
        </FilterChip>
        {members.map((member) => (
          <FilterChip
            key={member.user_id}
            href={hrefWith({ assigneeId: member.user_id })}
            active={filters.assigneeId === member.user_id}
          >
            {member.full_name}
          </FilterChip>
        ))}
      </FilterGroup>

      {labels.length > 0 ? (
        <FilterGroup label="Label">
          <FilterChip href={hrefWith({ labelId: undefined })} active={!filters.labelId}>
            Any
          </FilterChip>
          {labels.map((label) => (
            <FilterChip
              key={label.id}
              href={hrefWith({ labelId: label.id })}
              active={filters.labelId === label.id}
            >
              <span
                aria-hidden
                className="mr-1 inline-block size-2 rounded-full align-middle"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </FilterChip>
          ))}
        </FilterGroup>
      ) : null}

      {active > 0 ? (
        <Link
          href={basePath as Route}
          className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:underline"
        >
          Clear {active} filter{active === 1 ? '' : 's'}
        </Link>
      ) : null}
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <span className="sr-only">{label}</span>
      <div className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-0.5">
        {children}
      </div>
    </div>
  )
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: Route
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded px-2 py-1 text-xs font-medium transition ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </Link>
  )
}
