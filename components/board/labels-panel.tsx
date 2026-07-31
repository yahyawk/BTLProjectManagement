'use client'

import { useActionState } from 'react'

import { Field, FormError } from '@/components/ui/field'
import { Notice } from '@/components/ui/panel'
import {
  createLabelAction,
  deleteLabelAction,
  type TaskFormState,
} from '@/app/(app)/projects/[projectId]/actions'
import { LABEL_COLORS } from '@/lib/constants'
import type { Label } from '@/lib/types'

export function LabelsPanel({
  projectId,
  labels,
}: {
  projectId: string
  labels: Label[]
}) {
  const [state, formAction] = useActionState<TaskFormState, FormData>(createLabelAction, {})
  const [deleteState, deleteAction] = useActionState<TaskFormState, FormData>(
    deleteLabelAction,
    {},
  )

  return (
    <details className="rounded-xl border border-line bg-surface p-5">
      <summary className="cursor-pointer text-sm font-medium text-fg">
        Labels{labels.length > 0 ? ` (${labels.length})` : ''}
      </summary>

      <div className="mt-4 space-y-4">
        {labels.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <li key={label.id}>
                <form action={deleteAction} className="flex items-center">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="labelId" value={label.id} />
                  <span
                    className="rounded-l px-2 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                  <button
                    type="submit"
                    aria-label={`Delete label ${label.name}`}
                    title="Delete label"
                    className="rounded-r border border-l-0 border-line px-1.5 py-1 text-xs
                               text-subtle hover:bg-danger/10 hover:text-danger"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-subtle">
            No labels yet. Create one and it becomes available on every card in this project.
          </p>
        )}

        <FormError message={deleteState.error} />

        <form action={formAction} className="space-y-3 border-t border-line pt-4">
          <input type="hidden" name="projectId" value={projectId} />
          <FormError message={state.error} />
          <Notice message={state.notice} />
          <Field
            label="New label"
            name="name"
            type="text"
            placeholder="Incident"
            required
            maxLength={40}
            errors={state.fieldErrors?.name}
          />
          <fieldset>
            <legend className="block text-sm font-medium text-muted">Colour</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LABEL_COLORS.map((color, index) => (
                <label key={color} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={color}
                    defaultChecked={index === LABEL_COLORS.length - 1}
                    className="peer sr-only"
                  />
                  <span
                    className="block size-6 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-fg"
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-fg"
          >
            Create label
          </button>
        </form>
      </div>
    </details>
  )
}
