'use client'

import { useActionState } from 'react'

import { Field, FormError, SubmitButton } from '@/components/ui/field'
import { signupAction, type AuthFormState } from '../actions'

export function SignupForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    signupAction,
    {},
  )

  if (state.notice) {
    return (
      <p
        role="status"
        className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
      >
        {state.notice}
      </p>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <Field
        label="Full name"
        name="fullName"
        type="text"
        autoComplete="name"
        required
        errors={state.fieldErrors?.fullName}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        errors={state.fieldErrors?.password}
      />
      <SubmitButton>Create account</SubmitButton>
    </form>
  )
}
