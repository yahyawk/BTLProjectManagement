'use client'

import { useActionState } from 'react'

import { Field, FormError, SelectField, SubmitButton } from '@/components/ui/field'
import { Notice } from '@/components/ui/panel'
import {
  addMemberAction,
  createProjectAction,
  createWorkspaceAction,
  type FormState,
} from './actions'

export function CreateWorkspaceForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    createWorkspaceAction,
    {},
  )

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <Notice message={state.notice} />
      <Field
        label="Workspace name"
        name="name"
        type="text"
        placeholder="Acme Ops"
        required
        errors={state.fieldErrors?.name}
      />
      <SubmitButton>Create workspace</SubmitButton>
    </form>
  )
}

export function CreateProjectForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createProjectAction,
    {},
  )

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <FormError message={state.error} />
      <Notice message={state.notice} />
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field
          label="Project name"
          name="name"
          type="text"
          placeholder="Operations"
          required
          errors={state.fieldErrors?.name}
        />
        <Field
          label="Key"
          name="key"
          type="text"
          placeholder="OPS"
          maxLength={10}
          required
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm uppercase
                     tracking-wider text-fg placeholder:text-subtle transition-colors
                     hover:border-line-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
          errors={state.fieldErrors?.key}
        />
      </div>
      <p className="text-xs text-subtle">
        The key prefixes every task — <code className="text-muted">OPS-1</code>,{' '}
        <code className="text-muted">OPS-2</code>. 2–10 characters, starting with a letter.
      </p>
      <SubmitButton>Create project</SubmitButton>
    </form>
  )
}

export function AddMemberForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(addMemberAction, {})

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <FormError message={state.error} />
      <Notice message={state.notice} />
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="teammate@company.com"
          required
          errors={state.fieldErrors?.email}
        />
        <SelectField label="Role" name="role" defaultValue="member">
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </SelectField>
      </div>
      <p className="text-xs text-subtle">
        They need a BTL account already — email invitations for new addresses are out of
        MVP scope.
      </p>
      <SubmitButton>Add member</SubmitButton>
    </form>
  )
}
