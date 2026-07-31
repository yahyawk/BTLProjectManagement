import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { MemberRole, QueryResult, Workspace } from '@/lib/types'

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(80, 'Workspace name must be 80 characters or fewer'),
})

export const addMemberSchema = z.object({
  workspaceId: z.uuid('Invalid workspace'),
  email: z.email('Enter a valid email address').trim(),
  role: z.enum(['owner', 'admin', 'member', 'viewer'] as const satisfies readonly MemberRole[]),
})

export type WorkspaceMemberRow = {
  user_id: string
  role: MemberRole
  joined_at: string
  full_name: string
  email: string | null
  weekly_capacity_hours: number
}

/**
 * Workspaces the signed-in user belongs to. RLS (`workspaces_select` →
 * `is_workspace_member`) does the filtering — there is no user_id filter here
 * on purpose, so a policy regression shows up as a test failure, not as a
 * silently over-broad list.
 */
export async function listMyWorkspaces(): Promise<QueryResult<Workspace[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: data ?? [] }
}

/**
 * Creates a workspace and the creator's `owner` membership in one transaction.
 *
 * Goes through the `create_workspace_with_owner` RPC (migration 0002) because
 * a plain insert cannot work: `members_write` requires a role the creator does
 * not hold yet. See CLAUDE.md §8 issue #1.
 */
export async function createWorkspace(input: unknown): Promise<QueryResult<Workspace>> {
  const parsed = createWorkspaceSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('create_workspace_with_owner', { p_name: parsed.data.name })
    .single()

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: data as Workspace }
}

/**
 * Members of a workspace, joined to their profile.
 *
 * `!inner` keeps the profile join non-nullable; workspace_members.user_id is
 * NOT NULL and FKs to profiles, so a member always has one.
 */
export async function listWorkspaceMembers(
  workspaceId: string,
): Promise<QueryResult<WorkspaceMemberRow[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workspace_members')
    .select(
      'user_id, role, joined_at, profiles!inner(full_name, email, weekly_capacity_hours)',
    )
    .eq('workspace_id', workspaceId)
    .order('joined_at', { ascending: true })

  if (error) return { ok: false, error: error.message }

  const members = (data ?? []).map((row) => ({
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    full_name: row.profiles.full_name,
    email: row.profiles.email,
    weekly_capacity_hours: row.profiles.weekly_capacity_hours,
  }))

  return { ok: true, data: members }
}

/**
 * People assignable on a project — i.e. every member of its workspace.
 *
 * `project_members` exists to *narrow* access, but per schema.sql a project
 * with zero rows there is visible to the whole workspace, which is the only
 * mode the MVP uses. So workspace membership is the assignable set.
 */
export async function listProjectAssignees(
  projectId: string,
): Promise<QueryResult<WorkspaceMemberRow[]>> {
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) return { ok: false, error: projectError.message }
  if (!project) return { ok: true, data: [] }

  return listWorkspaceMembers(project.workspace_id)
}

/**
 * Adds an existing BTL user to a workspace by email, via the
 * `add_workspace_member_by_email` RPC (migration 0002).
 *
 * The RPC is needed because `profiles_select` only exposes people who already
 * share a workspace with you — the app cannot look up the invitee itself.
 * It re-checks owner/admin server-side, so this is not a UI-only guard.
 */
export async function addMemberByEmail(input: unknown): Promise<QueryResult<null>> {
  const parsed = addMemberSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .rpc('add_workspace_member_by_email', {
      p_workspace_id: parsed.data.workspaceId,
      p_email: parsed.data.email,
      p_role: parsed.data.role,
    })
    .single()

  if (error) {
    // The RPC raises these deliberately; surface them as-is because they are
    // written for humans. Anything else is a bug, not a user error.
    //
    // The matched string is the one raised by migration 0002, which is
    // immutable — so it still says "Teamflow" even though the product is now
    // BTL. Matching the old wording here is correct; rewriting the migration
    // would not be.
    if (error.message.includes('No Teamflow account exists')) {
      return {
        ok: false,
        error: `No BTL account exists for ${parsed.data.email}. They need to sign up first.`,
      }
    }
    if (error.message.includes('Only workspace owners and admins')) {
      return { ok: false, error: 'Only workspace owners and admins can add members.' }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true, data: null }
}
