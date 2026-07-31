import { z } from 'zod'

import { weekRange } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'

/** One person's load for one ISO week. */
export type WorkloadCell = {
  weekStart: string
  plannedHours: number
  recurringHours: number
  adhocHours: number
  taskCount: number
  adhocTaskCount: number
  utilizationPct: number
  adhocRatioPct: number
}

export type WorkloadRow = {
  userId: string
  fullName: string
  capacityHours: number
  cells: WorkloadCell[]
  totalPlanned: number
}

export type WorkloadGrid = {
  weeks: string[]
  rows: WorkloadRow[]
}

const EMPTY_CELL = {
  plannedHours: 0,
  recurringHours: 0,
  adhocHours: 0,
  taskCount: 0,
  adhocTaskCount: 0,
  utilizationPct: 0,
  adhocRatioPct: 0,
}

/**
 * People × weeks grid backed by `v_workload_weekly` (spec.md §5.3).
 *
 * Since migration 0005 that view runs with `security_invoker = on`, so RLS
 * scopes it to the caller — this deliberately does not add its own membership
 * filter beyond the workspace id, so a policy regression surfaces as a failing
 * RLS test rather than being masked here.
 *
 * Everyone in the workspace gets a row even with nothing assigned; an empty
 * row is a real answer ("this person has no planned work"), not a missing one.
 */
export async function getWorkloadGrid(
  workspaceId: string,
  options: { from: string; weeks?: number } = { from: new Date().toISOString().slice(0, 10) },
): Promise<QueryResult<WorkloadGrid>> {
  const weeks = weekRange(options.from, options.weeks ?? 6)
  const supabase = await createClient()

  const [membersRes, loadRes] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('user_id, profiles!inner(full_name, weekly_capacity_hours)')
      .eq('workspace_id', workspaceId),
    supabase
      .from('v_workload_weekly')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('week_start', weeks[0])
      .lte('week_start', weeks[weeks.length - 1]),
  ])

  if (membersRes.error) return { ok: false, error: membersRes.error.message }
  if (loadRes.error) return { ok: false, error: loadRes.error.message }

  const byPerson = new Map<string, Map<string, WorkloadCell>>()
  for (const row of loadRes.data ?? []) {
    if (!row.assignee_id || !row.week_start) continue
    if (!byPerson.has(row.assignee_id)) byPerson.set(row.assignee_id, new Map())
    byPerson.get(row.assignee_id)!.set(row.week_start, {
      weekStart: row.week_start,
      plannedHours: Number(row.planned_hours ?? 0),
      recurringHours: Number(row.recurring_hours ?? 0),
      adhocHours: Number(row.adhoc_hours ?? 0),
      taskCount: Number(row.task_count ?? 0),
      adhocTaskCount: Number(row.adhoc_task_count ?? 0),
      utilizationPct: Number(row.utilization_pct ?? 0),
      adhocRatioPct: Number(row.adhoc_ratio_pct ?? 0),
    })
  }

  const rows: WorkloadRow[] = (membersRes.data ?? [])
    .map((member) => {
      const cells = weeks.map(
        (week) =>
          byPerson.get(member.user_id)?.get(week) ?? { weekStart: week, ...EMPTY_CELL },
      )
      return {
        userId: member.user_id,
        fullName: member.profiles.full_name,
        capacityHours: Number(member.profiles.weekly_capacity_hours),
        cells,
        totalPlanned: cells.reduce((sum, c) => sum + c.plannedHours, 0),
      }
    })
    .sort((a, b) => b.totalPlanned - a.totalPlanned || a.fullName.localeCompare(b.fullName))

  return { ok: true, data: { weeks, rows } }
}

export const capacitySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or fewer'),
  jobTitle: z.string().trim().max(120).optional().or(z.literal('')),
  weeklyCapacityHours: z.coerce
    .number({ message: 'Capacity must be a number' })
    .min(0, 'Capacity cannot be negative')
    // numeric(5,2) — the column itself tops out below 1000.
    .max(168, 'There are only 168 hours in a week'),
  timezone: z.string().trim().min(1).max(60),
})
