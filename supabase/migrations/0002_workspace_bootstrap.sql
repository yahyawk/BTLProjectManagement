-- =====================================================================
-- 0002 — Workspace bootstrap RPCs
--
-- Fixes known issue #1 (CLAUDE.md §8): the policies in 0001 make the first
-- workspace_members insert impossible.
--
--   workspaces_insert  allows creating a workspace (created_by = auth.uid())
--   members_write      requires has_workspace_role(ws, '{owner,admin}')
--
-- ...but you only hold a role once a workspace_members row exists, and that
-- row is exactly what you are trying to insert. Deadlock. Every new workspace
-- would be orphaned the moment it was created.
--
-- Both functions below are `security definer` and therefore bypass RLS, so
-- each one does its own authorization check explicitly. EXECUTE is revoked
-- from anon/public and granted only to authenticated.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Slug helper: 'Acme Ops Team' -> 'acme-ops-team', uniquified on collision.
-- workspaces.slug is globally unique, so two teams picking the same name
-- must not fail the insert.
-- ---------------------------------------------------------------------
create or replace function generate_workspace_slug(p_name text)
returns text
language plpgsql
stable
security definer set search_path = public
as $$
declare
  -- v_ prefix is load-bearing: a variable named `slug` would shadow
  -- workspaces.slug inside the exists() below and raise 42702.
  v_base   text;
  v_slug   text;
  v_suffix integer := 1;
begin
  v_base := trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'));

  if v_base = '' then
    v_base := 'workspace';
  end if;

  v_base := left(v_base, 40);
  v_slug := v_base;

  while exists (select 1 from workspaces w where w.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  end loop;

  return v_slug;
end;
$$;

-- ---------------------------------------------------------------------
-- Create a workspace and make the caller its owner, atomically.
-- ---------------------------------------------------------------------
create or replace function create_workspace_with_owner(p_name text)
returns workspaces
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ws  workspaces;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Workspace name is required' using errcode = '22023';
  end if;

  insert into workspaces (name, slug, created_by)
  values (trim(p_name), generate_workspace_slug(p_name), uid)
  returning * into ws;

  insert into workspace_members (workspace_id, user_id, role)
  values (ws.id, uid, 'owner');

  return ws;
end;
$$;

-- ---------------------------------------------------------------------
-- Add an existing user to a workspace by email.
--
-- Needed because profiles_select only exposes profiles of people who ALREADY
-- share a workspace with you — so an admin cannot look up the person they are
-- trying to invite. This function does that lookup on their behalf, after
-- verifying they are an owner/admin of the target workspace.
--
-- MVP limitation: the person must already have a Teamflow account. Pending
-- invitations for unregistered emails would need an invitations table, and
-- email delivery is explicitly out of MVP scope (spec.md §2).
-- ---------------------------------------------------------------------
create or replace function add_workspace_member_by_email(
  p_workspace_id uuid,
  p_email        text,
  p_role         member_role default 'member'
)
returns workspace_members
language plpgsql
security definer set search_path = public
as $$
declare
  target_id uuid;
  m         workspace_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- Authorization is NOT automatic here: security definer skipped RLS.
  if not has_workspace_role(p_workspace_id, '{owner,admin}') then
    raise exception 'Only workspace owners and admins can add members'
      using errcode = '42501';
  end if;

  select id into target_id
  from profiles
  where lower(email) = lower(trim(p_email));

  if target_id is null then
    raise exception 'No Teamflow account exists for %. They need to sign up first.', p_email
      using errcode = 'P0002';
  end if;

  insert into workspace_members (workspace_id, user_id, role)
  values (p_workspace_id, target_id, p_role)
  on conflict (workspace_id, user_id)
    do update set role = excluded.role
  returning * into m;

  return m;
end;
$$;

-- ---------------------------------------------------------------------
-- These bypass RLS, so they must never be callable by anon.
-- ---------------------------------------------------------------------
revoke execute on function generate_workspace_slug(text)                       from public, anon;
revoke execute on function create_workspace_with_owner(text)                   from public, anon;
revoke execute on function add_workspace_member_by_email(uuid, text, member_role) from public, anon;

grant execute on function create_workspace_with_owner(text)                    to authenticated;
grant execute on function add_workspace_member_by_email(uuid, text, member_role) to authenticated;
