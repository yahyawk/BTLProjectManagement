/**
 * Plain constants safe to import from client components — no Supabase, no
 * `next/headers`, nothing that would drag the server client into a browser
 * bundle.
 */

/** Palette offered when creating a project label. */
export const LABEL_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#a855f7',
  '#64748b',
] as const

/** Gap between sparse `position` values. New rows land at max + this. */
export const POSITION_GAP = 1024
