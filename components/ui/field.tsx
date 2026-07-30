/**
 * Minimal form primitives for M0.
 *
 * Deliberately hand-rolled Tailwind, not shadcn/ui — shadcn is in spec §7 but
 * pulls in radix/cva/clsx/tailwind-merge, which need sign-off before install.
 * Swap these for shadcn primitives at M2 when the board needs real components.
 */
import type { InputHTMLAttributes } from 'react'

const inputClasses =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 ' +
  'focus:ring-indigo-500/30 disabled:opacity-60'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
  errors?: string[]
}

export function Field({ label, name, errors, ...props }: FieldProps) {
  const errorId = `${name}-error`

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className={inputClasses}
        aria-invalid={errors && errors.length > 0}
        aria-describedby={errors?.length ? errorId : undefined}
        {...props}
      />
      {errors?.length ? (
        <p id={errorId} className="text-sm text-red-600">
          {errors[0]}
        </p>
      ) : null}
    </div>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </p>
  )
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white
                 transition hover:bg-indigo-700 focus:outline-none focus:ring-2
                 focus:ring-indigo-500 focus:ring-offset-2"
    >
      {children}
    </button>
  )
}
