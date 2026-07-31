'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { BoardColumn, BoardTask } from '@/lib/queries/tasks'
import { moveTaskAction } from '@/app/(app)/projects/[projectId]/actions'
import { TaskCardBody, TaskCardLink } from './task-card'

type Props = {
  projectId: string
  columns: BoardColumn[]
  canWrite: boolean
  /** user_id -> full_name, so cards can show an assignee without another join. */
  assigneeNames: Record<string, string>
}

export function Board({
  projectId,
  columns: serverColumns,
  canWrite,
  assigneeNames,
}: Props) {
  // Optimistic mirror of the server data. Re-synced whenever the server sends
  // a new board (after revalidatePath), so a rejected move snaps back.
  const [columns, setColumns] = useState(serverColumns)
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    setColumns(serverColumns)
  }, [serverColumns])

  const sensors = useSensors(
    // A small distance threshold keeps a click-to-open from being read as a
    // drag, so cards stay clickable links.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const taskIndex = useMemo(() => {
    const map = new Map<string, { task: BoardTask; columnId: string; category: string }>()
    for (const column of columns) {
      for (const task of column.tasks)
        map.set(task.id, { task, columnId: column.id, category: column.category })
    }
    return map
  }, [columns])

  function handleDragStart(event: DragStartEvent) {
    setError(null)
    setActiveTask(taskIndex.get(String(event.active.id))?.task ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const activeId = String(active.id)
    const source = taskIndex.get(activeId)
    if (!source) return

    const overId = String(over.id)
    // Dropping on a column drops at its end; dropping on a card inserts there.
    const overColumn = columns.find((c) => c.id === overId)
    const target = overColumn
      ? { columnId: overColumn.id, index: overColumn.tasks.length }
      : (() => {
          const overTask = taskIndex.get(overId)
          if (!overTask) return null
          const column = columns.find((c) => c.id === overTask.columnId)!
          return { columnId: column.id, index: column.tasks.findIndex((t) => t.id === overId) }
        })()

    if (!target) return

    const previous = columns

    // Build the next board optimistically.
    const withoutTask = columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((t) => t.id !== activeId),
    }))

    const targetColumn = withoutTask.find((c) => c.id === target.columnId)!
    let insertAt = target.index
    if (source.columnId === target.columnId) {
      const oldIndex = previous
        .find((c) => c.id === source.columnId)!
        .tasks.findIndex((t) => t.id === activeId)
      if (oldIndex < target.index) insertAt = Math.max(0, target.index - 1)
    }
    insertAt = Math.min(insertAt, targetColumn.tasks.length)

    const moved = { ...source.task, status_id: target.columnId }
    targetColumn.tasks = [
      ...targetColumn.tasks.slice(0, insertAt),
      moved,
      ...targetColumn.tasks.slice(insertAt),
    ]

    const beforeId = targetColumn.tasks[insertAt - 1]?.id ?? null
    const afterId = targetColumn.tasks[insertAt + 1]?.id ?? null

    if (
      source.columnId === target.columnId &&
      beforeId === null &&
      afterId === null &&
      previous.find((c) => c.id === source.columnId)!.tasks.length === 1
    ) {
      return // nothing actually moved
    }

    setColumns(withoutTask)

    startTransition(async () => {
      const result = await moveTaskAction({
        projectId,
        taskId: activeId,
        statusId: target.columnId,
        beforeId,
        afterId,
      })

      if (!result.ok) {
        setColumns(previous)
        setError(result.error ?? 'Could not move that task.')
        return
      }

      // Pull the authoritative order back so positions stay in sync.
      router.refresh()
    })
  }

  if (!canWrite) {
    return (
      <>
        <p className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          You have view-only access to this project, so cards cannot be moved.
        </p>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((column) => (
            <ReadOnlyColumn
              key={column.id}
              column={column}
              projectId={projectId}
              assigneeNames={assigneeNames}
            />
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="mb-4 animate-pop rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              projectId={projectId}
              assigneeNames={assigneeNames}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[19rem] rotate-2 cursor-grabbing">
              <TaskCardBody
                task={activeTask}
                statusCategory={taskIndex.get(activeTask.id)?.category ?? 'todo'}
                assigneeName={
                  activeTask.assignee_id ? assigneeNames[activeTask.assignee_id] : undefined
                }
                dragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  )
}

function ColumnShell({
  column,
  children,
}: {
  column: BoardColumn
  children: React.ReactNode
}) {
  const overLimit = column.wip_limit !== null && column.tasks.length > column.wip_limit

  return (
    <section className="flex w-[19rem] shrink-0 flex-col rounded-xl border border-line bg-sunken/60 p-2.5">
      <header className="mb-2.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {column.name}
          </h3>
        </div>
        <span
          className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums ring-1 ring-inset ${
            overLimit
              ? 'bg-danger/12 text-danger ring-danger/25'
              : 'bg-surface text-subtle ring-line'
          }`}
          title={
            column.wip_limit
              ? `WIP limit ${column.wip_limit}${overLimit ? ' — exceeded' : ''}`
              : undefined
          }
        >
          {column.tasks.length}
          {column.wip_limit ? ` / ${column.wip_limit}` : ''}
        </span>
      </header>
      <div className="flex min-h-24 flex-col gap-2">{children}</div>
    </section>
  )
}

function Column({
  column,
  projectId,
  assigneeNames,
}: {
  column: BoardColumn
  projectId: string
  assigneeNames: Record<string, string>
}) {
  const { setNodeRef, isOver } = useSortable({ id: column.id, data: { isColumn: true } })

  return (
    <ColumnShell column={column}>
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-col gap-2 rounded-lg transition-colors duration-150 ${
          isOver ? 'bg-accent-soft/50 outline-2 outline-dashed outline-accent/40' : ''
        }`}
      >
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              projectId={projectId}
              statusCategory={column.category}
              assigneeNames={assigneeNames}
            />
          ))}
        </SortableContext>
        {column.tasks.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-subtle">Drop cards here</p>
        ) : null}
      </div>
    </ColumnShell>
  )
}

function ReadOnlyColumn({
  column,
  projectId,
  assigneeNames,
}: {
  column: BoardColumn
  projectId: string
  assigneeNames: Record<string, string>
}) {
  return (
    <ColumnShell column={column}>
      {column.tasks.map((task) => (
        <TaskCardLink
          key={task.id}
          task={task}
          projectId={projectId}
          statusCategory={column.category}
          assigneeName={task.assignee_id ? assigneeNames[task.assignee_id] : undefined}
        />
      ))}
    </ColumnShell>
  )
}

function SortableTask({
  task,
  projectId,
  statusCategory,
  assigneeNames,
}: {
  task: BoardTask
  projectId: string
  statusCategory: string
  assigneeNames: Record<string, string>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`touch-none ${isDragging ? 'opacity-30' : 'cursor-grab active:cursor-grabbing'}`}
      {...attributes}
      {...listeners}
    >
      <TaskCardLink
        task={task}
        projectId={projectId}
        statusCategory={statusCategory}
        assigneeName={task.assignee_id ? assigneeNames[task.assignee_id] : undefined}
      />
    </div>
  )
}
