/**
 * Date helpers shared by server and client components.
 *
 * Deliberately dependency-free and free of any Supabase import: anything a
 * `'use client'` module touches must not pull `next/headers` into the browser
 * bundle. `date-fns` arrives at M4 for the recurrence math (spec.md §7); none
 * of this needs it.
 */

/** Today as YYYY-MM-DD, for comparing against `date` columns. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Overdue = due before today and not in a done/cancelled column.
 *
 * Compares UTC dates against a `date` column. Good enough for MVP; a team
 * spread across timezones would want this evaluated in each viewer's
 * `profiles.timezone` instead.
 */
export function isOverdue(dueDate: string | null, category: string): boolean {
  if (!dueDate) return false
  if (category === 'done' || category === 'cancelled') return false
  return dueDate < todayIso()
}

/** 2026-08-04 -> "4 Aug". */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
