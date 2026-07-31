/**
 * Unit tests for the recurrence engine (spec.md §8 M4).
 *
 * Run with `npm test`. Uses Node's built-in test runner and native TypeScript
 * stripping, so there is no test-framework dependency to approve.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  computeNextOccurrence,
  firstOccurrence,
  isDue,
  isoWeekday,
  resolveMonthDay,
  upcomingOccurrences,
  type RecurrenceRule,
} from './recurrence.ts'

const MON = 1
const WED = 3
const FRI = 5

function rule(partial: Partial<RecurrenceRule>): RecurrenceRule {
  return {
    frequency: 'daily',
    intervalCount: 1,
    startDate: '2026-01-01',
    ...partial,
  }
}

describe('date primitives', () => {
  it('treats Monday as ISO weekday 1 and Sunday as 7', () => {
    assert.equal(isoWeekday('2026-08-03'), 1) // Monday
    assert.equal(isoWeekday('2026-08-09'), 7) // Sunday
  })

  it('clamps a day-of-month past the end of the month', () => {
    assert.equal(resolveMonthDay(2026, 2, 31), 28) // Feb, non-leap
    assert.equal(resolveMonthDay(2028, 2, 31), 29) // Feb, leap year
    assert.equal(resolveMonthDay(2026, 4, 31), 30) // 30-day month
    assert.equal(resolveMonthDay(2026, 1, 31), 31) // fits
  })

  it('resolves -1 to the last day of the month', () => {
    assert.equal(resolveMonthDay(2026, 2, -1), 28)
    assert.equal(resolveMonthDay(2028, 2, -1), 29)
    assert.equal(resolveMonthDay(2026, 12, -1), 31)
  })
})

describe('daily', () => {
  it('steps one day at a time', () => {
    const r = rule({ frequency: 'daily', startDate: '2026-08-01' })
    assert.equal(computeNextOccurrence(r, '2026-08-01'), '2026-08-02')
    assert.equal(computeNextOccurrence(r, '2026-08-02'), '2026-08-03')
  })

  it('honours an interval and stays in phase with startDate', () => {
    const r = rule({ frequency: 'daily', intervalCount: 3, startDate: '2026-08-01' })
    assert.deepEqual(upcomingOccurrences(r, '2026-08-01', 3), [
      '2026-08-04',
      '2026-08-07',
      '2026-08-10',
    ])
  })

  it('returns startDate when asked from before the template begins', () => {
    const r = rule({ frequency: 'daily', startDate: '2026-08-10' })
    assert.equal(computeNextOccurrence(r, '2026-07-01'), '2026-08-10')
    assert.equal(firstOccurrence(r), '2026-08-10')
  })

  it('crosses a month and a year boundary', () => {
    const r = rule({ frequency: 'daily', startDate: '2026-12-30' })
    assert.deepEqual(upcomingOccurrences(r, '2026-12-30', 3), [
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ])
  })
})

describe('weekly by weekday', () => {
  it('finds the next matching weekday', () => {
    // 2026-08-03 is a Monday.
    const r = rule({ frequency: 'weekly', byweekday: [MON], startDate: '2026-08-03' })
    assert.equal(firstOccurrence(r), '2026-08-03')
    assert.equal(computeNextOccurrence(r, '2026-08-03'), '2026-08-10')
    assert.equal(computeNextOccurrence(r, '2026-08-05'), '2026-08-10')
  })

  it('handles several weekdays in one week, in order', () => {
    const r = rule({
      frequency: 'weekly',
      byweekday: [MON, WED, FRI],
      startDate: '2026-08-03',
    })
    assert.deepEqual(upcomingOccurrences(r, '2026-08-02', 5), [
      '2026-08-03',
      '2026-08-05',
      '2026-08-07',
      '2026-08-10',
      '2026-08-12',
    ])
  })

  it('skips weeks for an interval, staying in phase with startDate', () => {
    const r = rule({
      frequency: 'weekly',
      intervalCount: 2,
      byweekday: [MON],
      startDate: '2026-08-03',
    })
    assert.deepEqual(upcomingOccurrences(r, '2026-08-02', 3), [
      '2026-08-03',
      '2026-08-17',
      '2026-08-31',
    ])
  })

  it('returns null when the rule has no weekdays', () => {
    const r = rule({ frequency: 'weekly', byweekday: [] })
    assert.equal(computeNextOccurrence(r, '2026-08-01'), null)
  })
})

describe('monthly by day', () => {
  it('repeats the same day each month', () => {
    const r = rule({ frequency: 'monthly', bymonthday: 15, startDate: '2026-01-15' })
    assert.deepEqual(upcomingOccurrences(r, '2026-01-15', 3), [
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ])
  })

  it('clamps the 31st into short months instead of spilling over', () => {
    const r = rule({ frequency: 'monthly', bymonthday: 31, startDate: '2026-01-31' })
    assert.deepEqual(upcomingOccurrences(r, '2026-01-30', 5), [
      '2026-01-31',
      '2026-02-28', // not 2026-03-03
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ])
  })

  it('clamps to 29 February in a leap year', () => {
    const r = rule({ frequency: 'monthly', bymonthday: 31, startDate: '2028-01-31' })
    assert.deepEqual(upcomingOccurrences(r, '2028-01-31', 2), ['2028-02-29', '2028-03-31'])
  })

  it('supports -1 as last day of month', () => {
    const r = rule({ frequency: 'monthly', bymonthday: -1, startDate: '2026-01-01' })
    assert.deepEqual(upcomingOccurrences(r, '2026-01-01', 4), [
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
  })

  it('falls back to the start date day when bymonthday is absent', () => {
    const r = rule({ frequency: 'monthly', startDate: '2026-03-09' })
    assert.deepEqual(upcomingOccurrences(r, '2026-03-09', 2), ['2026-04-09', '2026-05-09'])
  })

  it('honours a multi-month interval', () => {
    const r = rule({
      frequency: 'monthly',
      intervalCount: 2,
      bymonthday: 1,
      startDate: '2026-01-01',
    })
    assert.deepEqual(upcomingOccurrences(r, '2026-01-01', 3), [
      '2026-03-01',
      '2026-05-01',
      '2026-07-01',
    ])
  })
})

describe('quarterly', () => {
  it('steps three months at a time', () => {
    const r = rule({ frequency: 'quarterly', bymonthday: 1, startDate: '2026-01-01' })
    assert.deepEqual(upcomingOccurrences(r, '2026-01-01', 4), [
      '2026-04-01',
      '2026-07-01',
      '2026-10-01',
      '2027-01-01',
    ])
  })

  it('clamps month-end across quarters', () => {
    const r = rule({ frequency: 'quarterly', bymonthday: 31, startDate: '2025-11-30' })
    assert.deepEqual(upcomingOccurrences(r, '2025-11-30', 3), [
      '2026-02-28',
      '2026-05-31',
      '2026-08-31',
    ])
  })

  it('combines with an interval to give a half-yearly rule', () => {
    const r = rule({
      frequency: 'quarterly',
      intervalCount: 2,
      bymonthday: 1,
      startDate: '2026-01-01',
    })
    assert.deepEqual(upcomingOccurrences(r, '2026-01-01', 2), ['2026-07-01', '2027-01-01'])
  })
})

describe('endDate', () => {
  it('stops once the next occurrence would pass endDate', () => {
    const r = rule({
      frequency: 'weekly',
      byweekday: [MON],
      startDate: '2026-08-03',
      endDate: '2026-08-17',
    })
    assert.deepEqual(upcomingOccurrences(r, '2026-08-02', 10), [
      '2026-08-03',
      '2026-08-10',
      '2026-08-17',
    ])
    assert.equal(computeNextOccurrence(r, '2026-08-17'), null)
  })

  it('allows an occurrence landing exactly on endDate', () => {
    const r = rule({ frequency: 'daily', startDate: '2026-08-01', endDate: '2026-08-02' })
    assert.equal(computeNextOccurrence(r, '2026-08-01'), '2026-08-02')
  })
})

describe('isDue — lead time', () => {
  // The whole point of issue #4: next_run_at holds the OCCURRENCE date, and
  // generation fires lead_time_days before it. If this were comparing
  // next_run_at directly to today, lead_time_days would do nothing.
  it('fires exactly lead_time_days before the occurrence', () => {
    assert.equal(isDue('2026-08-10', 3, '2026-08-06'), false)
    assert.equal(isDue('2026-08-10', 3, '2026-08-07'), true)
    assert.equal(isDue('2026-08-10', 3, '2026-08-10'), true)
  })

  it('with zero lead time fires on the day itself', () => {
    assert.equal(isDue('2026-08-10', 0, '2026-08-09'), false)
    assert.equal(isDue('2026-08-10', 0, '2026-08-10'), true)
  })

  it('is still due when the occurrence is already in the past', () => {
    assert.equal(isDue('2026-07-01', 3, '2026-08-10'), true)
  })
})

describe('the M4 acceptance case', () => {
  it('an "every Monday" template advances past its window after one run', () => {
    // Template: every Monday, default lead time of 3 days. Today is Monday.
    const r = rule({ frequency: 'weekly', byweekday: [MON], startDate: '2026-08-03' })
    const today = '2026-08-03'

    let nextRunAt = firstOccurrence(r)!
    assert.equal(nextRunAt, '2026-08-03')

    // First cron run: due, so one task is created for 2026-08-03.
    assert.equal(isDue(nextRunAt, 3, today), true)
    const generated = [nextRunAt]
    nextRunAt = computeNextOccurrence(r, nextRunAt)!
    assert.equal(nextRunAt, '2026-08-10')

    // Second run on the same day: 2026-08-10 minus 3 days is 2026-08-07,
    // which is still in the future, so nothing is generated.
    assert.equal(isDue(nextRunAt, 3, today), false)
    assert.deepEqual(generated, ['2026-08-03'])
  })
})
