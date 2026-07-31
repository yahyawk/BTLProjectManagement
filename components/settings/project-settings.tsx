'use client'

import { useActionState } from 'react'

import { Field, FormError, SubmitButton } from '@/components/ui/field'
import { Notice } from '@/components/ui/panel'
import { SelectField } from '@/components/board/task-fields'
import {
  createStatusAction,
  deleteStatusAction,
  moveStatusAction,
  updateProjectAction,
  updateStatusAction,
  type SettingsFormState,
} from '@/app/(app)/projects/[projectId]/settings/actions'
import { LABEL_COLORS } from '@/lib/constants'
import type { Project, StatusCategory, WorkflowStatus } from '@/lib/types'

const CATEGORY_LABELS: Record<StatusCategory, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
}

export function ProjectDetailsForm({ project }: { project: Project }) {
  const [state, formAction] = useActionState<SettingsFormState, FormData>(
    updateProjectAction,
    {},
  )

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={project.id} />
      <FormError message={state.error} />
      <Notice message={state.notice} />

      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field
          label="Project name"
          name="name"
          type="text"
          defaultValue={project.name}
          required
          errors={state.fieldErrors?.name}
        />
        <Field
          label="Key"
          name="key"
          type="text"
          defaultValue={project.key}
          maxLength={10}
          required
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm uppercase
                     tracking-wide text-slate-900 focus:border-indigo-500 focus:outline-none
                     focus:ring-2 focus:ring-indigo-500/30"
          errors={state.fieldErrors?.key}
        />
      </div>
      <p className="text-xs text-slate-500">
        Changing the key only affects <strong>new</strong> tasks. Existing refs like{' '}
        <code>{project.key}-1</code> are stored strings and keep their original prefix —
        rewriting them would break every link already shared outside the app.
      </p>

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={project.description ?? ''}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm
                     focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      <SelectField label="State" name="state" defaultValue={project.state}>
        <option value="active">Active</option>
        <option value="on_hold">On hold</option>
        <option value="completed">Completed</option>
        <option value="archived">Archived — hidden from the project list</option>
      </SelectField>

      <SubmitButton>Save project</SubmitButton>
    </form>
  )
}

export function ColumnsEditor({
  projectId,
  statuses,
}: {
  projectId: string
  statuses: WorkflowStatus[]
}) {
  const [createState, createAction] = useActionState<SettingsFormState, FormData>(
    createStatusAction,
    {},
  )
  const [editState, editAction] = useActionState<SettingsFormState, FormData>(
    updateStatusAction,
    {},
  )
  const [deleteState, deleteAction] = useActionState<SettingsFormState, FormData>(
    deleteStatusAction,
    {},
  )

  return (
    <div className="space-y-5">
      <FormError message={editState.error} />
      <FormError message={deleteState.error} />
      <Notice message={editState.notice} />
      <Notice message={deleteState.notice} />

      <ul className="space-y-2">
        {statuses.map((status, index) => (
          <li key={status.id} className="rounded-lg border border-slate-200 p-3">
            <form action={editAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="statusId" value={status.id} />
              <span
                aria-hidden
                className="mb-2.5 size-3 shrink-0 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <div className="min-w-40 flex-1">
                <Field label="Name" name="name" type="text" defaultValue={status.name} required />
              </div>
              <div className="w-40">
                <SelectField label="Category" name="category" defaultValue={status.category}>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="w-28">
                <Field
                  label="WIP limit"
                  name="wipLimit"
                  type="number"
                  min={1}
                  placeholder="none"
                  defaultValue={status.wip_limit ?? ''}
                />
              </div>
              <button
                type="submit"
                className="h-[38px] rounded-md border border-slate-300 px-3 text-sm font-medium
                           text-slate-700 hover:bg-slate-100"
              >
                Save
              </button>
            </form>

            <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
              <ReorderButton
                projectId={projectId}
                statusId={status.id}
                direction="left"
                disabled={index === 0}
              />
              <ReorderButton
                projectId={projectId}
                statusId={status.id}
                direction="right"
                disabled={index === statuses.length - 1}
              />
              <form action={deleteAction} className="ml-auto">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="statusId" value={status.id} />
                <button
                  type="submit"
                  className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete column
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <form action={createAction} className="space-y-3 border-t border-slate-100 pt-4">
        <input type="hidden" name="projectId" value={projectId} />
        <FormError message={createState.error} />
        <Notice message={createState.notice} />
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1">
            <Field
              label="New column"
              name="name"
              type="text"
              placeholder="Blocked"
              required
              errors={createState.fieldErrors?.name}
            />
          </div>
          <div className="w-40">
            <SelectField label="Category" name="category" defaultValue="todo">
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="w-28">
            <Field label="WIP limit" name="wipLimit" type="number" min={1} placeholder="none" />
          </div>
        </div>
        <fieldset>
          <legend className="block text-sm font-medium text-slate-700">Colour</legend>
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
                  className="block size-6 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-900"
                  style={{ backgroundColor: color }}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Add column
        </button>
      </form>

      <p className="text-xs text-slate-500">
        The <strong>category</strong> is what reporting groups by, so a column named
        &ldquo;Shipped&rdquo; still counts as done everywhere. A column holding tasks cannot be
        deleted — the foreign key refuses it, so nobody&apos;s work can be orphaned by a
        settings change.
      </p>
    </div>
  )
}

function ReorderButton({
  projectId,
  statusId,
  direction,
  disabled,
}: {
  projectId: string
  statusId: string
  direction: 'left' | 'right'
  disabled: boolean
}) {
  return (
    <form action={moveStatusAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="statusId" value={statusId} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={direction === 'left' ? 'Move column left' : 'Move column right'}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700
                   hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {direction === 'left' ? '←' : '→'}
      </button>
    </form>
  )
}
