import Link from 'next/link'
import type { Route } from 'next'

import { Avatar, Chip, WorkTypeBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/panel'
import { formatDate, isOverdue } from '@/lib/dates'
import { getBoard, type BoardTask } from '@/lib/queries/tasks'
import { listProjectAssignees } from '@/lib/queries/workspaces'

export const metadata = { title: 'List' }

type SortKey = 'ref' | 'title' | 'work_type' | 'assignee' | 'due_date' | 'estimate' | 'status'

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'ref', label: 'Ref', className: 'w-24' },
  { key: 'title', label: 'Title' },
  { key: 'work_type', label: 'Type', className: 'w-28' },
  { key: 'assignee', label: 'Assignee', className: 'w-40' },
  { key: 'due_date', label: 'Due', className: 'w-24' },
  { key: 'estimate', label: 'Est.', className: 'w-20' },
  { key: 'status', label: 'Status', className: 'w-32' },
]

type Row = BoardTask & { statusName: string; statusCategory: string; assigneeName: string }

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ sort?: string; dir?: string }>
}) {
  const { projectId } = await params
  const { sort, dir } = await searchParams

  const sortKey = (COLUMNS.find((c) => c.key === sort)?.key ?? 'ref') as SortKey
  const descending = dir === 'desc'

  const [boardResult, membersResult] = await Promise.all([
    getBoard(projectId),
    listProjectAssignees(projectId),
  ])

  if (!boardResult.ok) {
    return (
      <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Could not load the list: {boardResult.error}
      </p>
    )
  }

  const names = new Map(
    (membersResult.ok ? membersResult.data : []).map((m) => [m.user_id, m.full_name]),
  )

  // The board query already scopes and orders everything; flattening here
  // keeps one source of truth for what "the project's tasks" means.
  const rows: Row[] = boardResult.data.flatMap((column) =>
    column.tasks.map((task) => ({
      ...task,
      statusName: column.name,
      statusCategory: column.category,
      assigneeName: task.assignee_id ? (names.get(task.assignee_id) ?? '—') : '—',
    })),
  )

  rows.sort((a, b) => compare(a, b, sortKey) * (descending ? -1 : 1))

  function sortHref(key: SortKey): Route {
    const nextDir = key === sortKey && !descending ? 'desc' : 'asc'
    return `/projects/${projectId}/list?sort=${key}&dir=${nextDir}` as Route
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-subtle">
        {rows.length} open {rows.length === 1 ? 'task' : 'tasks'} · click a heading to sort
      </p>

      {rows.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Create one on the board and it appears here."
          action={
            <Link
              href={`/projects/${projectId}/board` as Route}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg"
            >
              Go to board
            </Link>
          }
        />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle ${
                      column.className ?? ''
                    }`}
                  >
                    <Link
                      href={sortHref(column.key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-fg"
                      aria-sort={
                        column.key === sortKey
                          ? descending
                            ? 'descending'
                            : 'ascending'
                          : 'none'
                      }
                    >
                      {column.label}
                      {column.key === sortKey ? (
                        <span aria-hidden>{descending ? '↓' : '↑'}</span>
                      ) : null}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const overdue = isOverdue(row.due_date, row.statusCategory)

                return (
                  <tr
                    key={row.id}
                    className="border-b border-line transition-colors last:border-0 hover:bg-elevated"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/projects/${projectId}/tasks/${row.ref}` as Route}
                        className="font-mono text-[11px] font-semibold text-accent hover:underline"
                      >
                        {row.ref}
                      </Link>
                    </td>
                    <td className="max-w-0 px-3 py-2">
                      <Link
                        href={`/projects/${projectId}/tasks/${row.ref}` as Route}
                        className="block truncate font-medium text-fg hover:underline"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <WorkTypeBadge workType={row.work_type} size="sm" />
                    </td>
                    <td className="px-3 py-2">
                      {row.assigneeName === '—' ? (
                        <span className="text-subtle">—</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Avatar
                            name={row.assigneeName}
                            seed={row.assignee_id ?? row.assigneeName}
                            size="xs"
                          />
                          <span className="truncate text-muted">{row.assigneeName}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.due_date ? (
                        <Chip tone={overdue ? 'danger' : 'neutral'}>
                          {formatDate(row.due_date)}
                        </Chip>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted">
                      {row.estimate_hours !== null ? `${row.estimate_hours}h` : '—'}
                    </td>
                    <td className="px-3 py-2 text-muted">{row.statusName}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Nulls always sort last, regardless of direction — an unset due date is not "earliest". */
function compare(a: Row, b: Row, key: SortKey): number {
  switch (key) {
    case 'title':
      return a.title.localeCompare(b.title)
    case 'work_type':
      return a.work_type.localeCompare(b.work_type)
    case 'assignee':
      return a.assigneeName.localeCompare(b.assigneeName)
    case 'status':
      return a.statusName.localeCompare(b.statusName)
    case 'due_date':
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    case 'estimate':
      if (a.estimate_hours === null && b.estimate_hours === null) return 0
      if (a.estimate_hours === null) return 1
      if (b.estimate_hours === null) return -1
      return a.estimate_hours - b.estimate_hours
    case 'ref':
    default: {
      // OPS-10 must sort after OPS-9, so compare the numeric suffix.
      const na = Number(a.ref.split('-').pop())
      const nb = Number(b.ref.split('-').pop())
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
      return a.ref.localeCompare(b.ref)
    }
  }
}
