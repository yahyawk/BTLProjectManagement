'use server'

import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { signIn, signOut, signUp } from '@/lib/queries/auth'

export type AuthFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  notice?: string
}

/**
 * Only allow same-origin relative paths through the ?next= param — otherwise
 * a crafted link could bounce a freshly-authenticated user to another host.
 * The cast is unavoidable: this is runtime data, so `typedRoutes` can't check it.
 */
function safeRedirect(next: FormDataEntryValue | null): Route {
  const value = typeof next === 'string' ? next : ''
  const safe = value.startsWith('/') && !value.startsWith('//') ? value : '/'
  return safe as Route
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = await signIn({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors }
  }

  revalidatePath('/', 'layout')
  redirect(safeRedirect(formData.get('next')))
}

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = await signUp({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors }
  }

  // With "Confirm email" disabled in Supabase Auth, signUp returns a live
  // session and we can go straight to the workspace home. With it enabled,
  // there is no session yet — tell the user to check their inbox.
  if (result.data.session === 'pending_email_confirmation') {
    return {
      notice:
        'Account created. Check your email for a confirmation link, then sign in.',
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOutAction() {
  await signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
