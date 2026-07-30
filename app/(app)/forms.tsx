'use client'

import { useActionState } from 'react'

import { Field, FormError, SubmitButton } from '@/components/ui/field'
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
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
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
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm
                     uppercase tracking-wide text-slate-900 placeholder:text-slate-400
                     focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          errors={state.fieldErrors?.key}
        />
      </div>
      <p className="text-xs text-slate-500">
        The key prefixes every task in the project — <code>OPS-1</code>,{' '}
        <code>OPS-2</code>. 2–10 characters, letters and digits, starting with a letter.
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
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="teammate@company.com"
          required
          errors={state.fieldErrors?.email}
        />
        <div className="space-y-1.5">
          <label htmlFor="role" className="block text-sm font-medium text-slate-700">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="member"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm
                       text-slate-900 focus:border-indigo-500 focus:outline-none
                       focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        They need a Teamflow account already — email invitations for new addresses are
        out of MVP scope.
      </p>
      <SubmitButton>Add member</SubmitButton>
    </form>
  )
}
