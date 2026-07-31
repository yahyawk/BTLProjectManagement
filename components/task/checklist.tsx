'use client'

import { useActionState, useRef } from 'react'

import { FormError } from '@/components/ui/field'
import {
  addChecklistItemAction,
  deleteChecklistItemAction,
  toggleChecklistItemAction,
  type TaskFormState,
} from '@/app/(app)/projects/[projectId]/actions'
import type { TaskChecklistItem } from '@/lib/types'

export function Checklist({
  projectId,
  taskId,
  items,
  canWrite,
}: {
  projectId: string
  taskId: string
  items: TaskChecklistItem[]
  canWrite: boolean
}) {
  const [state, formAction] = useActionState<TaskFormState, FormData>(
    addChecklistItemAction,
    {},
  )
  const formRef = useRef<HTMLFormElement>(null)
  const done = items.filter((item) => item.is_done).length

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-900">Checklist</h3>
        {items.length > 0 ? (
          <span className="text-xs text-slate-500">
            {done} / {items.length}
          </span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <>
          <div
            className="h-1 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={items.length}
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(done / items.length) * 100}%` }}
            />
          </div>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <form action={toggleChecklistItemAction} className="flex min-w-0 flex-1 items-center gap-2">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="isDone" value={item.is_done ? 'false' : 'true'} />
                  <button
                    type="submit"
                    disabled={!canWrite}
                    aria-label={item.is_done ? 'Mark not done' : 'Mark done'}
                    className={`grid size-4 shrink-0 place-items-center rounded border text-[10px] ${
                      item.is_done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 bg-white'
                    } ${canWrite ? '' : 'cursor-not-allowed opacity-60'}`}
                  >
                    {item.is_done ? '✓' : ''}
                  </button>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      item.is_done ? 'text-slate-400 line-through' : 'text-slate-800'
                    }`}
                  >
                    {item.content}
                  </span>
                </form>
                {canWrite ? (
                  <form action={deleteChecklistItemAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <button
                      type="submit"
                      aria-label="Delete item"
                      className="rounded px-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-slate-500">No checklist items yet.</p>
      )}

      {canWrite ? (
        <form
          ref={formRef}
          action={async (formData) => {
            await formAction(formData)
            formRef.current?.reset()
          }}
          className="flex gap-2"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="taskId" value={taskId} />
          <input
            name="content"
            placeholder="Add an item"
            required
            maxLength={200}
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm
                       focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Add
          </button>
        </form>
      ) : null}
      <FormError message={state.error} />
    </section>
  )
}
