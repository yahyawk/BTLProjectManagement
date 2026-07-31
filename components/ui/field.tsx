import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { IconAlert } from './icons'

export const controlClasses =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg ' +
  'placeholder:text-subtle transition-[border-color,box-shadow] duration-150 ' +
  'hover:border-line-strong focus:border-accent focus:outline-none ' +
  'focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
  hint?: string
  errors?: string[]
}

export function Field({ label, name, hint, errors, className, ...props }: FieldProps) {
  const invalid = Boolean(errors?.length)

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className={`${className ?? controlClasses} ${
          invalid ? 'border-danger focus:border-danger focus:ring-danger/15' : ''
        }`}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${name}-error` : hint ? `${name}-hint` : undefined}
        {...props}
      />
      {hint && !invalid ? (
        <p id={`${name}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
      {invalid ? (
        <p id={`${name}-error`} className="text-xs font-medium text-danger">
          {errors?.[0]}
        </p>
      ) : null}
    </div>
  )
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  name: string
  errors?: string[]
}

export function SelectField({ label, name, errors, children, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-xs font-medium text-muted">
        {label}
      </label>
      <select id={name} name={name} className={`${controlClasses} pr-8`} {...props}>
        {children}
      </select>
      {errors?.length ? (
        <p className="text-xs font-medium text-danger">{errors[0]}</p>
      ) : null}
    </div>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  name: string
}

export function TextareaField({ label, name, ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-xs font-medium text-muted">
        {label}
      </label>
      <textarea id={name} name={name} className={`${controlClasses} resize-y`} {...props} />
    </div>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p
      role="alert"
      className="flex animate-pop items-start gap-2 rounded-lg border border-danger/30
                 bg-danger/10 px-3 py-2 text-sm text-danger"
    >
      <IconAlert className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg hover:brightness-110 active:brightness-95 shadow-card',
  secondary: 'border border-line bg-surface text-fg hover:bg-elevated hover:border-line-strong',
  ghost: 'text-muted hover:bg-elevated hover:text-fg',
  danger: 'bg-danger text-white hover:brightness-110 active:brightness-95',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
}) {
  const sizing = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium
                  transition-all duration-150 active:scale-[0.98]
                  disabled:pointer-events-none disabled:opacity-50
                  ${buttonVariants[variant]} ${sizing} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function SubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <Button type="submit" variant="primary" className="w-full" disabled={disabled}>
      {children}
    </Button>
  )
}
