-- =====================================================================
-- 0003 — Task ref generation + task write access
--
-- Fixes known issue #6 (CLAUDE.md §8) and the policy hole underneath it.
--
-- In 0001:
--   * `tasks_all` is FOR ALL using can_access_project(), which only checks
--     workspace MEMBERSHIP. A `viewer` therefore passes it and can insert,
--     update and delete tasks.
--   * `assign_task_ref()` is not security definer, so its
--     `update projects set task_counter = ...` runs under the caller's RLS.
--     `projects_write` excludes viewers, so for a viewer the UPDATE matches
--     zero rows, RETURNING assigns NULL, and the insert dies on `ref` being
--     NOT NULL — a confusing 23502 for what is really an authorization
--     problem.
--
-- Two separate bugs wearing one trenchcoat. Fixed independently:
--   1. Viewers must not write tasks at all -> split the policy by role.
--   2. Ref generation must not depend on the caller's rights on `projects`
--      -> make the trigger security definer.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Write access = workspace membership AND a role above `viewer`.
-- Mirrors `projects_write`, but scoped through a project id.
-- ---------------------------------------------------------------------
create or replace function can_write_project(p_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from projects p
    where p.id = p_id
      and has_workspace_role(p.workspace_id, '{owner,admin,member}')
  );
$$;

revoke execute on function can_write_project(uuid) from public, anon;
grant  execute on function can_write_project(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Replace the blanket tasks policy with read/write split by role.
-- ---------------------------------------------------------------------
drop policy if exists tasks_all on tasks;

create policy tasks_select on tasks for select
  using (can_access_project(project_id));

create policy tasks_insert on tasks for insert
  with check (can_write_project(project_id));

create policy tasks_update on tasks for update
  using (can_write_project(project_id))
  with check (can_write_project(project_id));

create policy tasks_delete on tasks for delete
  using (can_write_project(project_id));

-- ---------------------------------------------------------------------
-- Ref generation is an internal invariant, not a user-authorized write.
-- security definer so the counter bump always succeeds; authorization for
-- creating the task itself is enforced by tasks_insert above.
--
-- search_path is pinned: a security definer function with a mutable
-- search_path is a privilege-escalation vector.
-- ---------------------------------------------------------------------
create or replace function assign_task_ref()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_next_num integer;
  v_proj_key text;
begin
  update projects
     set task_counter = task_counter + 1
   where id = new.project_id
  returning task_counter, key into v_next_num, v_proj_key;

  if v_proj_key is null then
    raise exception 'Project % does not exist', new.project_id
      using errcode = '23503';
  end if;

  new.ref := v_proj_key || '-' || v_next_num;
  return new;
end;
$$;
