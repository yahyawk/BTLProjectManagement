-- =====================================================================
-- 0004 — Extend the read/write split to every project-scoped table
--
-- 0003 fixed `tasks`, but the same mistake is in five more policies from
-- 0001: they gate writes on can_access_project()/can_access_task(), which
-- only prove MEMBERSHIP. A `viewer` therefore has full write access to
-- board columns, labels, recurrence templates and project membership.
--
-- This is not new feature work — it is finishing the fix 0003 started.
-- Leaving it until each table's own milestone would mean shipping known
-- privilege-escalation holes in the meantime (spec.md §9: "RLS on every
-- table, no exceptions").
--
-- Read access is unchanged everywhere: any workspace member still sees
-- everything in the workspace.
-- =====================================================================

-- Task-scoped equivalent of can_write_project().
create or replace function can_write_task(t_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from tasks t
    where t.id = t_id and can_write_project(t.project_id)
  );
$$;

revoke execute on function can_write_task(uuid) from public, anon;
grant  execute on function can_write_task(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Board columns
-- ---------------------------------------------------------------------
drop policy if exists statuses_all on workflow_statuses;

create policy statuses_select on workflow_statuses for select
  using (can_access_project(project_id));
create policy statuses_insert on workflow_statuses for insert
  with check (can_write_project(project_id));
create policy statuses_update on workflow_statuses for update
  using (can_write_project(project_id)) with check (can_write_project(project_id));
create policy statuses_delete on workflow_statuses for delete
  using (can_write_project(project_id));

-- ---------------------------------------------------------------------
-- Labels
-- ---------------------------------------------------------------------
drop policy if exists labels_all on labels;

create policy labels_select on labels for select
  using (can_access_project(project_id));
create policy labels_insert on labels for insert
  with check (can_write_project(project_id));
create policy labels_update on labels for update
  using (can_write_project(project_id)) with check (can_write_project(project_id));
create policy labels_delete on labels for delete
  using (can_write_project(project_id));

-- ---------------------------------------------------------------------
-- Recurrence templates (M4 uses these; locking them down now)
-- ---------------------------------------------------------------------
drop policy if exists templates_all on recurrence_templates;

create policy templates_select on recurrence_templates for select
  using (can_access_project(project_id));
create policy templates_insert on recurrence_templates for insert
  with check (can_write_project(project_id));
create policy templates_update on recurrence_templates for update
  using (can_write_project(project_id)) with check (can_write_project(project_id));
create policy templates_delete on recurrence_templates for delete
  using (can_write_project(project_id));

-- ---------------------------------------------------------------------
-- Project membership
-- ---------------------------------------------------------------------
drop policy if exists project_members_all on project_members;

create policy project_members_select on project_members for select
  using (can_access_project(project_id));
create policy project_members_write on project_members for all
  using (can_write_project(project_id)) with check (can_write_project(project_id));

-- ---------------------------------------------------------------------
-- Task satellites
-- ---------------------------------------------------------------------
drop policy if exists task_labels_all on task_labels;

create policy task_labels_select on task_labels for select
  using (can_access_task(task_id));
create policy task_labels_insert on task_labels for insert
  with check (can_write_task(task_id));
create policy task_labels_delete on task_labels for delete
  using (can_write_task(task_id));

drop policy if exists checklist_all on task_checklist_items;

create policy checklist_select on task_checklist_items for select
  using (can_access_task(task_id));
create policy checklist_insert on task_checklist_items for insert
  with check (can_write_task(task_id));
create policy checklist_update on task_checklist_items for update
  using (can_write_task(task_id)) with check (can_write_task(task_id));
create policy checklist_delete on task_checklist_items for delete
  using (can_write_task(task_id));

-- ---------------------------------------------------------------------
-- Comments are deliberately NOT restricted to writers.
--
-- A viewer commenting is a normal expectation in every tool this borrows
-- from, and 0001 already scopes it correctly: you may only insert a
-- comment authored by yourself, and only edit or delete your own. Left
-- as-is on purpose rather than by omission.
-- ---------------------------------------------------------------------
