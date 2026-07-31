import { Board } from '@/components/board/board'
import { FilterBar } from '@/components/board/filter-bar'
import { LabelsPanel } from '@/components/board/labels-panel'
import { NewTaskForm } from '@/components/board/new-task-form'
import { RealtimeBoard } from '@/components/board/realtime-board'
import { Panel, Stat } from '@/components/ui/panel'
import { isOverdue } from '@/lib/dates'
import { listLabels } from '@/lib/queries/labels'
import { canWriteProject } from '@/lib/queries/projects'
import { getBoard, type BoardFilters } from '@/lib/queries/tasks'
import { listProjectAssignees } from '@/lib/queries/workspaces'
import type { PriorityLevel, WorkType } from '@/lib/types'

export const metadata = { title: 'Board' }

const WORK_TYPES: WorkType[] = ['recurring', 'adhoc']
const PRIORITIES: PriorityLevel[] = ['urgent', 'high', 'medium', 'low']

/** Only let known values through — a junk query param must not reach the query. */
function parseFilters(raw: Record<string, string | string[] | undefined>): BoardFilters {
  const one = (key: string) => {
    const value = raw[key]
    return typeof value === 'string' ? value : undefined
  }

  const workType = one('workType')
  const priority = one('priority')

  return {
    assigneeId: one('assigneeId'),
    workType: WORK_TYPES.includes(workType as WorkType) ? (workType as WorkType) : undefined,
    priority: PRIORITIES.includes(priority as PriorityLevel)
      ? (priority as PriorityLevel)
      : undefined,
    labelId: one('labelId'),
  }
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { projectId } = await params
  const filters = parseFilters(await searchParams)

  const [boardResult, membersResult, labelsResult, canWrite] = await Promise.all([
    getBoard(projectId, filters),
    listProjectAssignees(projectId),
    listLabels(projectId),
    canWriteProject(projectId),
  ])

  if (!boardResult.ok) {
    return (
      <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Could not load the board: {boardResult.error}
      </p>
    )
  }

  const columns = boardResult.data
  const statuses = columns.map(({ tasks: _tasks, ...status }) => status)
  const members = membersResult.ok ? membersResult.data : []
  const labels = labelsResult.ok ? labelsResult.data : []

  const assigneeNames = Object.fromEntries(members.map((m) => [m.user_id, m.full_name]))

  let recurring = 0
  let adhoc = 0
  let overdue = 0
  let estimated = 0
  for (const column of columns) {
    for (const task of column.tasks) {
      if (task.work_type === 'adhoc') adhoc += 1
      else recurring += 1
      if (isOverdue(task.due_date, column.category)) overdue += 1
      estimated += task.estimate_hours ?? 0
    }
  }
  const total = recurring + adhoc

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-stretch gap-3">
        <Stat label="Recurring" value={recurring} accent="recurring" />
        <Stat label="Ad-hoc" value={adhoc} accent="adhoc" />
        <Stat
          label="Unplanned"
          value={total > 0 ? `${Math.round((adhoc / total) * 100)}%` : '—'}
          hint="Share of open cards that are interrupts"
        />
        <Stat label="Estimated" value={`${estimated}h`} hint="Across all open cards" />
        <Stat
          label="Overdue"
          value={overdue}
          accent={overdue > 0 ? 'danger' : 'success'}
          hint={overdue > 0 ? 'Past due and not done' : 'Nothing past due'}
        />
        <div className="flex items-center pl-1">
          <RealtimeBoard projectId={projectId} />
        </div>
      </div>

      <FilterBar
        basePath={`/projects/${projectId}/board`}
        filters={filters}
        members={members}
        labels={labels}
      />

      <Board
        projectId={projectId}
        columns={columns}
        canWrite={canWrite}
        assigneeNames={assigneeNames}
      />

      {canWrite ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel
            title="New task"
            description="Every task is recurring or ad-hoc. You have to say which."
          >
            <NewTaskForm projectId={projectId} statuses={statuses} members={members} />
          </Panel>
          <LabelsPanel projectId={projectId} labels={labels} />
        </div>
      ) : null}
    </div>
  )
}
