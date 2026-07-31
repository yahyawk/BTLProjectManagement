/**
 * Recurrence maths for `recurrence_templates`.
 *
 * Pure and dependency-free on purpose:
 *   - it is unit-tested directly with `node --test` (no test runner dependency)
 *   - it is imported by a client component to preview upcoming occurrences,
 *     so it must not pull in anything server-only
 *
 * Every date here is a plain `YYYY-MM-DD` string, matching the `date` columns.
 * All arithmetic is done in UTC so a server timezone can never shift a date.
 *
 * `date-fns` is listed in spec.md §7 and stays available, but the month-end
 * clamping below has to be written by hand regardless, so nothing is gained by
 * taking the dependency here.
 */

export type IsoDate = string

export type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  intervalCount: number
  /** ISO weekdays, 1 = Monday … 7 = Sunday. Required for `weekly`. */
  byweekday?: number[] | null
  /** Day of month; -1 means "last day of the month". */
  bymonthday?: number | null
  startDate: IsoDate
  endDate?: IsoDate | null
}

// --- date primitives --------------------------------------------------

/** Days since the epoch, as an integer. Safe to compare and difference. */
function toDayNumber(iso: IsoDate): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

function fromDayNumber(days: number): IsoDate {
  return new Date(days * 86_400_000).toISOString().slice(0, 10)
}

export function addDays(iso: IsoDate, n: number): IsoDate {
  return fromDayNumber(toDayNumber(iso) + n)
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(iso: IsoDate): number {
  const [y, m, d] = iso.split('-').map(Number)
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function ymd(year: number, month: number, day: number): IsoDate {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/**
 * Resolves a `bymonthday` against a specific month.
 *
 * -1 means the last day. Anything past the end of the month clamps to the last
 * day rather than spilling into the next one — so "the 31st" lands on 28 Feb
 * (29 in a leap year), 30 April, and so on. Spilling would silently move a
 * month-end report into the following month.
 */
export function resolveMonthDay(year: number, month: number, day: number): number {
  const last = daysInMonth(year, month)
  if (day === -1) return last
  return Math.min(day, last)
}

/** Monday of the ISO week containing `iso`. */
function weekStart(iso: IsoDate): IsoDate {
  return addDays(iso, -(isoWeekday(iso) - 1))
}

// --- the rule engine --------------------------------------------------

/** Guards against a malformed rule spinning forever. */
const MAX_STEPS = 2000

/**
 * The first occurrence strictly after `after`, or null when the rule has run
 * out (past `endDate`, or no valid occurrence within a sane search window).
 *
 * "Strictly after" is what makes advancing `next_run_at` terminate: feeding the
 * occurrence just generated back in always moves forward.
 */
export function computeNextOccurrence(
  rule: RecurrenceRule,
  after: IsoDate,
): IsoDate | null {
  const interval = Math.max(1, Math.trunc(rule.intervalCount || 1))
  const candidate = nextRaw(rule, after, interval)

  if (candidate === null) return null
  if (rule.endDate && candidate > rule.endDate) return null

  return candidate
}

/** The first occurrence on or after `startDate` — i.e. the initial `next_run_at`. */
export function firstOccurrence(rule: RecurrenceRule): IsoDate | null {
  return computeNextOccurrence(rule, addDays(rule.startDate, -1))
}

/** Convenience for previews: the next `count` occurrences after `after`. */
export function upcomingOccurrences(
  rule: RecurrenceRule,
  after: IsoDate,
  count: number,
): IsoDate[] {
  const out: IsoDate[] = []
  let cursor = after

  for (let i = 0; i < count; i += 1) {
    const next = computeNextOccurrence(rule, cursor)
    if (next === null) break
    out.push(next)
    cursor = next
  }

  return out
}

function nextRaw(rule: RecurrenceRule, after: IsoDate, interval: number): IsoDate | null {
  // Never produce anything before the template's own start date.
  const floor = after < rule.startDate ? addDays(rule.startDate, -1) : after

  switch (rule.frequency) {
    case 'daily':
      return nextDaily(rule, floor, interval)
    case 'weekly':
      return nextWeekly(rule, floor, interval)
    case 'monthly':
      return nextMonthly(rule, floor, interval)
    case 'quarterly':
      // Quarterly is monthly with a 3-month step. Keeping it as an alias means
      // one code path and one set of month-end edge cases to reason about.
      return nextMonthly(rule, floor, interval * 3)
    default:
      return null
  }
}

function nextDaily(rule: RecurrenceRule, after: IsoDate, interval: number): IsoDate | null {
  const start = toDayNumber(rule.startDate)
  const target = toDayNumber(after)

  if (target < start) return rule.startDate

  // Smallest k with start + k*interval > target.
  const k = Math.floor((target - start) / interval) + 1
  return fromDayNumber(start + k * interval)
}

function nextWeekly(rule: RecurrenceRule, after: IsoDate, interval: number): IsoDate | null {
  const weekdays = [...(rule.byweekday ?? [])]
    .filter((d) => d >= 1 && d <= 7)
    .sort((a, b) => a - b)

  // `weekly_needs_weekdays` makes this impossible from the database, but the
  // function is also called on unsaved form input.
  if (weekdays.length === 0) return null

  // Interval weeks are counted from the week containing startDate, so "every
  // other Tuesday" stays in phase with the template rather than with the year.
  const baseWeek = toDayNumber(weekStart(rule.startDate))

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const weekBegin = baseWeek + step * interval * 7
    for (const weekday of weekdays) {
      const candidate = fromDayNumber(weekBegin + (weekday - 1))
      if (candidate > after && candidate >= rule.startDate) return candidate
    }
  }

  return null
}

function nextMonthly(rule: RecurrenceRule, after: IsoDate, step: number): IsoDate | null {
  const [startYear, startMonth, startDay] = rule.startDate.split('-').map(Number)
  // With no bymonthday, repeat the start date's day-of-month.
  const wanted = rule.bymonthday ?? startDay

  for (let i = 0; i < MAX_STEPS; i += 1) {
    const monthsFromStart = i * step
    const year = startYear + Math.floor((startMonth - 1 + monthsFromStart) / 12)
    const month = ((startMonth - 1 + monthsFromStart) % 12) + 1

    const candidate = ymd(year, month, resolveMonthDay(year, month, wanted))
    if (candidate > after && candidate >= rule.startDate) return candidate
  }

  return null
}

/**
 * Should the generator create this template's next instance yet?
 *
 * spec.md §5.1 is ambiguous about `next_run_at` (CLAUDE.md §8 issue #4): it
 * says to advance it "to the following occurrence" while also using
 * `lead_time_days` to make the task appear early. Those cannot both be true of
 * one column. The agreed reading is that `next_run_at` holds the **occurrence
 * date**, and generation fires `lead_time_days` before it — otherwise the
 * lead time is a no-op.
 */
export function isDue(
  nextRunAt: IsoDate,
  leadTimeDays: number,
  today: IsoDate,
): boolean {
  return addDays(nextRunAt, -Math.max(0, leadTimeDays)) <= today
}
