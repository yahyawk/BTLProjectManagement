import { Board } from '@/components/board/board'
import { NewTaskForm } from '@/components/board/new-task-form'
import { Panel } from '@/components/ui/panel'
import { canWriteProject } from '@/lib/queries/projects'
import { getBoard } from '@/lib/queries/tasks'

export const metadata = { title: 'Board · Teamflow' }

export default async function BoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  const [boardResult, canWrite] = await Promise.all([
    getBoard(projectId),
    canWriteProject(projectId),
  ])

  if (!boardResult.ok) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load the board: {boardResult.error}
      </p>
    )
  }

  const columns = boardResult.data
  const statuses = columns.map(({ tasks: _tasks, ...status }) => status)
  const totals = columns.reduce(
    (acc, column) => {
      for (const task of column.tasks) {
        if (task.work_type === 'adhoc') acc.adhoc += 1
        else acc.recurring += 1
      }
      return acc
    },
    { recurring: 0, adhoc: 0 },
  )
  const total = totals.recurring + totals.adhoc

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-recurring" />
          <span className="text-slate-600">{totals.recurring} recurring</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-adhoc" />
          <span className="text-slate-600">{totals.adhoc} ad-hoc</span>
        </span>
        {total > 0 ? (
          <span className="text-slate-400">
            · {Math.round((totals.adhoc / total) * 100)}% of open cards are unplanned
          </span>
        ) : null}
      </div>

      <Board projectId={projectId} columns={columns} canWrite={canWrite} />

      {canWrite ? (
        <div className="max-w-xl">
          <Panel title="New task" description="Every task is recurring or ad-hoc. You have to say which.">
            <NewTaskForm projectId={projectId} statuses={statuses} />
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
