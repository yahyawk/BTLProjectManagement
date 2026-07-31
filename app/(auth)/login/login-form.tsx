'use client'

import { useActionState } from 'react'

import { Field, FormError, SubmitButton } from '@/components/ui/field'
import { loginAction, type AuthFormState } from '../actions'

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(loginAction, {})

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? '/'} />
      <FormError message={state.error} />
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
        placeholder="••••••••"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      <SubmitButton>Sign in</SubmitButton>
    </form>
  )
}
