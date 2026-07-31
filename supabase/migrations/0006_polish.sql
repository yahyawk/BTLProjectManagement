-- =====================================================================
-- 0006 — Replay safety, function hardening, Realtime
--
-- Closes the last two known issues (CLAUDE.md §8 #8 and #9).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Issue #9 — mutable search_path on the trigger functions.
--
-- A function without a pinned search_path resolves unqualified names using
-- the CALLER's search_path. These run on every task and project write, so
-- pinning them removes a whole class of shadowing surprise. (assign_task_ref
-- was already pinned in 0003 when it became security definer.)
--
-- Bodies are unchanged from 0001 apart from the `set search_path`.
-- ---------------------------------------------------------------------
create or replace function seed_default_statuses()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into workflow_statuses (project_id, name, category, position, color) values
    (new.id, 'Backlog',     'todo',        1024, '#94a3b8'),
    (new.id, 'In Progress', 'in_progress', 2048, '#3b82f6'),
    (new.id, 'In Review',   'in_progress', 3072, '#a855f7'),
    (new.id, 'Done',        'done',        4096, '#22c55e');
  return new;
end;
$$;

create or replace function sync_task_completion()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_category status_category;
begin
  select category into v_category from workflow_statuses where id = new.status_id;

  if v_category = 'done' and new.completed_at is null then
    new.completed_at := now();
  elsif v_category <> 'done' then
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Trigger functions have no business being reachable as PostgREST RPCs.
--
-- Calling one directly fails anyway ("trigger functions can only be called
-- as triggers", 0A000), so this is defence in depth rather than a live hole
-- — but it clears the advisor warning and shrinks the exposed API surface.
--
-- Safe for the triggers themselves: PostgreSQL checks EXECUTE on a trigger
-- function when the trigger is CREATED, not each time it fires.
-- ---------------------------------------------------------------------
revoke execute on function seed_default_statuses() from public, anon, authenticated;
revoke execute on function sync_task_completion()  from public, anon, authenticated;
revoke execute on function assign_task_ref()       from public, anon, authenticated;
revoke execute on function handle_new_user()       from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Issue #8 — `alter publication ... add table` is not idempotent.
--
-- 0001 runs it unguarded, so replaying the migration set against a database
-- that already has these tables published fails with 42710 and takes the
-- whole migration down with it. Guarded here so a rebuild from scratch is
-- reproducible.
-- ---------------------------------------------------------------------
do $$
declare
  v_table text;
begin
  foreach v_table in array array['tasks', 'task_comments'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Realtime board sync (M6) filters the tasks channel by project_id.
--
-- With the default replica identity a DELETE only carries the primary key,
-- so a delete would never match that filter and boards would keep showing
-- cards that no longer exist. FULL puts the whole old row in the WAL record.
-- ---------------------------------------------------------------------
alter table tasks replica identity full;
