import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { Project, QueryResult } from '@/lib/types'

/**
 * `key` mirrors the CHECK constraint in 0001: ^[A-Z][A-Z0-9]{1,9}$
 * Validating it here means the user gets a readable message instead of a
 * Postgres constraint-violation string.
 */
export const createProjectSchema = z.object({
  workspaceId: z.uuid('Invalid workspace'),
  name: z
    .string()
    .trim()
    .min(2, 'Project name must be at least 2 characters')
    .max(80, 'Project name must be 80 characters or fewer'),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z][A-Z0-9]{1,9}$/,
      'Key must be 2–10 characters, start with a letter, and use only A–Z and 0–9',
    ),
})

/**
 * Projects in a workspace, newest last. RLS (`projects_select`) restricts this
 * to workspaces the caller belongs to.
 *
 * Archived projects are excluded to match `idx_projects_workspace`.
 */
export async function listProjects(workspaceId: string): Promise<QueryResult<Project[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', workspaceId)
    .neq('state', 'archived')
    .order('created_at', { ascending: true })

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: data ?? [] }
}

/** A single project by id, or null when RLS hides it / it does not exist. */
export async function getProject(projectId: string): Promise<QueryResult<Project | null>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }

  return { ok: true, data }
}

/** Whether the signed-in user may write tasks here (i.e. is not a viewer). */
export async function canWriteProject(projectId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('can_write_project', { p_id: projectId })

  if (error) return false

  return data === true
}

/**
 * Creates a project. The `on_project_created` trigger seeds the four default
 * workflow_statuses (Backlog / In Progress / In Review / Done) — do not insert
 * them here (CLAUDE.md §5.6).
 */
export async function createProject(input: unknown): Promise<QueryResult<Project>> {
  const parsed = createProjectSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'You are not signed in.' }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      workspace_id: parsed.data.workspaceId,
      name: parsed.data.name,
      key: parsed.data.key,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // unique (workspace_id, key)
    if (error.code === '23505') {
      return {
        ok: false,
        error: `A project with key ${parsed.data.key} already exists in this workspace.`,
        fieldErrors: { key: ['This key is already taken'] },
      }
    }
    // projects_write denies viewers
    if (error.code === '42501') {
      return { ok: false, error: 'You do not have permission to create projects here.' }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true, data }
}

export const updateProjectSchema = z.object({
  projectId: z.uuid('Invalid project'),
  name: z
    .string()
    .trim()
    .min(2, 'Project name must be at least 2 characters')
    .max(80, 'Project name must be 80 characters or fewer'),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z][A-Z0-9]{1,9}$/,
      'Key must be 2–10 characters, start with a letter, and use only A–Z and 0–9',
    ),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  state: z.enum(['active', 'on_hold', 'completed', 'archived']),
})

/**
 * Renames a project or changes its key.
 *
 * Note the key only affects tasks created *afterwards*: `tasks.ref` is a
 * stored string set at insert time, so existing OPS-1…OPS-9 keep their old
 * prefix. Rewriting them would break every link and reference already shared
 * outside the app, which is worse than a mixed prefix.
 */
export async function updateProject(input: unknown): Promise<QueryResult<Project>> {
  const parsed = updateProjectSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .update({
      name: parsed.data.name,
      key: parsed.data.key,
      description: parsed.data.description || null,
      state: parsed.data.state,
    })
    .eq('id', parsed.data.projectId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        error: `Another project in this workspace already uses the key ${parsed.data.key}.`,
        fieldErrors: { key: ['This key is already taken'] },
      }
    }
    if (error.code === '42501') {
      return { ok: false, error: 'You do not have permission to edit this project.' }
    }
    return { ok: false, error: error.message }
  }
  if (!data) return { ok: false, error: 'That project no longer exists, or you cannot edit it.' }

  return { ok: true, data }
}
