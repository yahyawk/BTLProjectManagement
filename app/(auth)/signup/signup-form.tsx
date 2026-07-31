'use client'

import { useActionState } from 'react'

import { Field, FormError, SubmitButton } from '@/components/ui/field'
import { IconCheck } from '@/components/ui/icons'
import { signupAction, type AuthFormState } from '../actions'

export function SignupForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signupAction, {})

  if (state.notice) {
    return (
      <div className="animate-pop space-y-3 text-center">
        <span className="mx-auto grid size-10 place-items-center rounded-full bg-success/12 text-success">
          <IconCheck className="size-5" />
        </span>
        <p className="text-sm text-fg">{state.notice}</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <Field
        label="Full name"
        name="fullName"
        type="text"
        placeholder="Ada Lovelace"
        autoComplete="name"
        required
        errors={state.fieldErrors?.fullName}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        placeholder="you@company.com"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        minLength={8}
        required
        errors={state.fieldErrors?.password}
      />
      <SubmitButton>Create account</SubmitButton>
    </form>
  )
}
