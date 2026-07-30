/**
 * Hand-written aliases over the generated Supabase types.
 * Import app types from here; import `Database` itself only inside
 * /lib/supabase and /lib/queries.
 */
import type { Enums, Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

// --- Enums ------------------------------------------------------------
export type WorkType = Enums<'work_type'>
export type StatusCategory = Enums<'status_category'>
export type PriorityLevel = Enums<'priority_level'>
export type MemberRole = Enums<'member_role'>
export type ProjectState = Enums<'project_state'>
export type RecurrenceFreq = Enums<'recurrence_freq'>

// --- Rows -------------------------------------------------------------
export type Profile = Tables<'profiles'>
export type Workspace = Tables<'workspaces'>
export type WorkspaceMember = Tables<'workspace_members'>
export type Project = Tables<'projects'>
export type WorkflowStatus = Tables<'workflow_statuses'>
export type Label = Tables<'labels'>
export type RecurrenceTemplate = Tables<'recurrence_templates'>
export type Task = Tables<'tasks'>
export type TaskChecklistItem = Tables<'task_checklist_items'>
export type TaskComment = Tables<'task_comments'>
export type TimeEntry = Tables<'time_entries'>
export type TaskActivity = Tables<'task_activity'>

// --- Reporting views --------------------------------------------------
export type TaskLoadRow = Tables<'v_task_load'>
export type WorkloadWeeklyRow = Tables<'v_workload_weekly'>
export type AdhocRatioWeeklyRow = Tables<'v_adhoc_ratio_weekly'>

// --- Write shapes -----------------------------------------------------
export type ProfileUpdate = TablesUpdate<'profiles'>
export type TaskInsert = TablesInsert<'tasks'>
export type TaskUpdate = TablesUpdate<'tasks'>

/**
 * Uniform return shape for every function in /lib/queries.
 * Server Actions must be able to hand this straight back to a form without
 * leaking a Postgres error string into the UI.
 */
export type QueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
