import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'

export type AdhocTrendPoint = {
  weekStart: string
  tasksCreated: number
  adhocCreated: number
  recurringCreated: number
  adhocPct: number
}

export type ProjectLoad = {
  projectId: string
  name: string
  key: string
  color: string
  plannedHours: number
  adhocHours: number
  taskCount: number
}

/**
 * Ad-hoc pressure over time for the whole workspace (spec.md §6, /reports).
 *
 * `v_adhoc_ratio_weekly` is per-project, so the per-week percentage has to be
 * recomputed from the summed counts — averaging the per-project percentages
 * would weight a project with 2 tasks the same as one with 200.
 */
export async function getAdhocTrend(
  workspaceId: string,
  weeks = 12,
): Promise<QueryResult<AdhocTrendPoint[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('v_adhoc_ratio_weekly')
    .select('week_start, tasks_created, adhoc_created')
    .eq('workspace_id', workspaceId)
    .order('week_start', { ascending: true })

  if (error) return { ok: false, error: error.message }

  const totals = new Map<string, { created: number; adhoc: number }>()
  for (const row of data ?? []) {
    if (!row.week_start) continue
    const current = totals.get(row.week_start) ?? { created: 0, adhoc: 0 }
    current.created += Number(row.tasks_created ?? 0)
    current.adhoc += Number(row.adhoc_created ?? 0)
    totals.set(row.week_start, current)
  }

  const points = [...totals.entries()]
    .map(([weekStart, t]) => ({
      weekStart,
      tasksCreated: t.created,
      adhocCreated: t.adhoc,
      recurringCreated: t.created - t.adhoc,
      adhocPct: t.created === 0 ? 0 : Math.round((t.adhoc / t.created) * 1000) / 10,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-weeks)

  return { ok: true, data: points }
}

/** Open load per project, for the "load by project" panel on /reports. */
export async function getLoadByProject(
  workspaceId: string,
): Promise<QueryResult<ProjectLoad[]>> {
  const supabase = await createClient()

  const [loadRes, projectsRes] = await Promise.all([
    supabase
      .from('v_task_load')
      .select('project_id, estimate_hours, work_type')
      .eq('workspace_id', workspaceId),
    supabase
      .from('projects')
      .select('id, name, key, color')
      .eq('workspace_id', workspaceId)
      .neq('state', 'archived'),
  ])

  if (loadRes.error) return { ok: false, error: loadRes.error.message }
  if (projectsRes.error) return { ok: false, error: projectsRes.error.message }

  const totals = new Map<string, { planned: number; adhoc: number; count: number }>()
  for (const row of loadRes.data ?? []) {
    if (!row.project_id) continue
    const current = totals.get(row.project_id) ?? { planned: 0, adhoc: 0, count: 0 }
    const hours = Number(row.estimate_hours ?? 0)
    current.planned += hours
    if (row.work_type === 'adhoc') current.adhoc += hours
    current.count += 1
    totals.set(row.project_id, current)
  }

  const rows = (projectsRes.data ?? [])
    .map((project) => {
      const t = totals.get(project.id) ?? { planned: 0, adhoc: 0, count: 0 }
      return {
        projectId: project.id,
        name: project.name,
        key: project.key,
        color: project.color,
        plannedHours: t.planned,
        adhocHours: t.adhoc,
        taskCount: t.count,
      }
    })
    .sort((a, b) => b.plannedHours - a.plannedHours)

  return { ok: true, data: rows }
}
