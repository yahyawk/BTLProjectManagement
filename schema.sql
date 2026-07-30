-- =====================================================================
-- Teamflow — MVP schema for Supabase / Postgres
-- Companion to spec.md
--
-- Run in the Supabase SQL editor, or save as
-- supabase/migrations/0001_init.sql and run `supabase db push`.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------

create type work_type        as enum ('recurring', 'adhoc');
create type status_category  as enum ('todo', 'in_progress', 'blocked', 'done', 'cancelled');
create type priority_level   as enum ('urgent', 'high', 'medium', 'low');
create type member_role      as enum ('owner', 'admin', 'member', 'viewer');
create type project_state    as enum ('active', 'on_hold', 'completed', 'archived');
create type recurrence_freq  as enum ('daily', 'weekly', 'monthly', 'quarterly');

-- ---------------------------------------------------------------------
-- 2. Profiles  (1:1 with auth.users — capacity lives here)
-- ---------------------------------------------------------------------

create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text        not null default '',
  email                 text,
  avatar_url            text,
  job_title             text,
  weekly_capacity_hours numeric(5,2) not null default 40 check (weekly_capacity_hours >= 0),
  timezone              text        not null default 'Asia/Jakarta',
  is_active             boolean     not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on column profiles.weekly_capacity_hours is
  'Denominator for the workload view. Part-timers get less than 40.';

-- Auto-create a profile row whenever a user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- 3. Workspaces & membership
-- ---------------------------------------------------------------------

create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  slug       text not null unique,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references profiles(id)   on delete cascade,
  role         member_role not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index idx_workspace_members_user on workspace_members(user_id);

-- security definer: breaks RLS recursion when policies query membership
create or replace function is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function has_workspace_role(ws_id uuid, roles member_role[])
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role = any(roles)
  );
$$;

-- ---------------------------------------------------------------------
-- 4. Projects
-- ---------------------------------------------------------------------

create table projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  key          text not null check (key ~ '^[A-Z][A-Z0-9]{1,9}$'),  -- e.g. OPS, ENG2
  description  text,
  color        text not null default '#6366f1',
  state        project_state not null default 'active',
  lead_id      uuid references profiles(id) on delete set null,
  start_date   date,
  target_date  date,
  task_counter integer not null default 0,   -- drives OPS-1, OPS-2, ...
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, key)
);

create index idx_projects_workspace on projects(workspace_id) where state <> 'archived';

-- Optional narrowing of access. If a project has zero rows here,
-- every workspace member can see it.
create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       member_role not null default 'member',
  primary key (project_id, user_id)
);

-- ---------------------------------------------------------------------
-- 5. Workflow statuses (the board columns)
-- ---------------------------------------------------------------------

create table workflow_statuses (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name       text not null,
  category   status_category not null,
  position   numeric not null default 1024,
  wip_limit  integer check (wip_limit is null or wip_limit > 0),
  color      text not null default '#94a3b8',
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index idx_statuses_project on workflow_statuses(project_id, position);

-- Seed four default columns on every new project.
create or replace function seed_default_statuses()
returns trigger
language plpgsql
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

create trigger on_project_created
  after insert on projects
  for each row execute function seed_default_statuses();

-- ---------------------------------------------------------------------
-- 6. Labels
-- ---------------------------------------------------------------------

create table labels (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name       text not null,
  color      text not null default '#64748b',
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

-- ---------------------------------------------------------------------
-- 7. Recurrence templates  (the engine behind "regular load")
-- ---------------------------------------------------------------------

create table recurrence_templates (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  title               text not null,
  description         text,
  default_assignee_id uuid references profiles(id) on delete set null,
  priority            priority_level not null default 'medium',
  estimate_hours      numeric(6,2) check (estimate_hours is null or estimate_hours >= 0),

  frequency           recurrence_freq not null,
  interval_count      integer not null default 1 check (interval_count between 1 and 52),
  -- weekly: ISO weekdays, 1 = Mon ... 7 = Sun. e.g. '{1,3,5}'
  byweekday           smallint[] check (
                        byweekday is null or
                        (array_length(byweekday, 1) > 0 and byweekday <@ '{1,2,3,4,5,6,7}'::smallint[])
                      ),
  -- monthly/quarterly: day of month. -1 means last day of month.
  bymonthday          smallint check (bymonthday is null or bymonthday between -1 and 31),

  start_date          date not null,
  end_date            date,
  -- create the task this many days before its due date
  lead_time_days      integer not null default 3 check (lead_time_days between 0 and 90),
  next_run_at         date not null,
  is_active           boolean not null default true,

  created_by          uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint weekly_needs_weekdays
    check (frequency <> 'weekly' or byweekday is not null),
  constraint end_after_start
    check (end_date is null or end_date >= start_date)
);

create index idx_templates_due
  on recurrence_templates(next_run_at)
  where is_active = true;

-- ---------------------------------------------------------------------
-- 8. Tasks  (the core table)
-- ---------------------------------------------------------------------

create table tasks (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid not null references projects(id) on delete cascade,
  ref                    text not null,                    -- 'OPS-142', set by trigger
  title                  text not null check (length(trim(title)) > 0),
  description            text,

  -- THE differentiator: never nullable, never defaulted in the UI
  work_type              work_type not null,

  status_id              uuid not null references workflow_statuses(id) on delete restrict,
  priority               priority_level not null default 'medium',
  assignee_id            uuid references profiles(id) on delete set null,
  reporter_id            uuid references profiles(id) on delete set null,
  parent_task_id         uuid references tasks(id) on delete cascade,   -- one level of subtasks

  estimate_hours         numeric(6,2) check (estimate_hours is null or estimate_hours >= 0),
  story_points           smallint     check (story_points is null or story_points >= 0),
  start_date             date,
  due_date               date,
  completed_at           timestamptz,

  -- ad-hoc provenance: where did this interrupt come from?
  requested_by           text,
  source_note            text,

  recurrence_template_id uuid references recurrence_templates(id) on delete set null,

  position               numeric not null default 1024,
  is_archived            boolean not null default false,
  created_by             uuid references profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint ref_unique_per_project unique (project_id, ref),
  constraint no_self_parent check (parent_task_id is null or parent_task_id <> id),
  constraint due_after_start check (due_date is null or start_date is null or due_date >= start_date)
);

-- Idempotency guard for the recurrence generator: one instance per
-- template per due date, no matter how many times the cron fires.
create unique index idx_recurrence_instance_unique
  on tasks(recurrence_template_id, due_date)
  where recurrence_template_id is not null;

create index idx_tasks_board       on tasks(project_id, status_id, position) where is_archived = false;
create index idx_tasks_assignee    on tasks(assignee_id, due_date)           where is_archived = false;
create index idx_tasks_work_type   on tasks(project_id, work_type)           where is_archived = false;
create index idx_tasks_parent      on tasks(parent_task_id)                  where parent_task_id is not null;
create index idx_tasks_due         on tasks(due_date)                        where is_archived = false;

-- Generate the human-readable key: OPS-1, OPS-2, ...
create or replace function assign_task_ref()
returns trigger
language plpgsql
as $$
declare
  next_num integer;
  proj_key text;
begin
  update projects
     set task_counter = task_counter + 1
   where id = new.project_id
  returning task_counter, key into next_num, proj_key;

  new.ref := proj_key || '-' || next_num;
  return new;
end;
$$;

create trigger before_task_insert
  before insert on tasks
  for each row execute function assign_task_ref();

-- Stamp completed_at whenever the task lands in a 'done' column.
create or replace function sync_task_completion()
returns trigger
language plpgsql
as $$
declare
  cat status_category;
begin
  select category into cat from workflow_statuses where id = new.status_id;

  if cat = 'done' and new.completed_at is null then
    new.completed_at := now();
  elsif cat <> 'done' then
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger before_task_write
  before insert or update on tasks
  for each row execute function sync_task_completion();

-- ---------------------------------------------------------------------
-- 9. Task satellites
-- ---------------------------------------------------------------------

create table task_labels (
  task_id  uuid not null references tasks(id)  on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create table task_checklist_items (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  content    text not null,
  is_done    boolean not null default false,
  position   numeric not null default 1024,
  created_at timestamptz not null default now()
);

create index idx_checklist_task on task_checklist_items(task_id, position);

create table task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_comments_task on task_comments(task_id, created_at);

create table time_entries (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  hours      numeric(5,2) not null check (hours > 0 and hours <= 24),
  entry_date date not null default current_date,
  note       text,
  created_at timestamptz not null default now()
);

create index idx_time_user_date on time_entries(user_id, entry_date);
create index idx_time_task      on time_entries(task_id);

-- Append-only audit log (Jira-style history)
create table task_activity (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  actor_id   uuid references profiles(id) on delete set null,
  field      text not null,          -- 'status', 'assignee', 'work_type', ...
  old_value  text,
  new_value  text,
  created_at timestamptz not null default now()
);

create index idx_activity_task on task_activity(task_id, created_at desc);

-- ---------------------------------------------------------------------
-- 10. Reporting views
-- ---------------------------------------------------------------------

-- Every open task bucketed into an ISO week.
create or replace view v_task_load as
select
  t.id                                as task_id,
  t.project_id,
  p.workspace_id,
  t.assignee_id,
  t.work_type,
  t.priority,
  coalesce(t.estimate_hours, 0)       as estimate_hours,
  date_trunc('week',
    coalesce(t.due_date, t.start_date, t.created_at::date)
  )::date                             as week_start
from tasks t
join projects p          on p.id = t.project_id
join workflow_statuses s on s.id = t.status_id
where t.is_archived = false
  and s.category not in ('done', 'cancelled')
  and t.parent_task_id is null;   -- subtask hours roll up into the parent

-- Per-person, per-week: recurring vs ad-hoc against capacity.
create or replace view v_workload_weekly as
select
  l.workspace_id,
  l.assignee_id,
  pr.full_name,
  pr.weekly_capacity_hours                                              as capacity_hours,
  l.week_start,
  sum(l.estimate_hours)                                                  as planned_hours,
  sum(l.estimate_hours) filter (where l.work_type = 'recurring')         as recurring_hours,
  sum(l.estimate_hours) filter (where l.work_type = 'adhoc')             as adhoc_hours,
  count(*)                                                               as task_count,
  count(*) filter (where l.work_type = 'adhoc')                          as adhoc_task_count,
  round(
    sum(l.estimate_hours) / nullif(pr.weekly_capacity_hours, 0) * 100, 1
  )                                                                      as utilization_pct
from v_task_load l
join profiles pr on pr.id = l.assignee_id
where l.assignee_id is not null
group by l.workspace_id, l.assignee_id, pr.full_name,
         pr.weekly_capacity_hours, l.week_start;

-- Ad-hoc pressure over time, per project.
create or replace view v_adhoc_ratio_weekly as
select
  p.workspace_id,
  t.project_id,
  date_trunc('week', t.created_at)::date                          as week_start,
  count(*)                                                        as tasks_created,
  count(*) filter (where t.work_type = 'adhoc')                   as adhoc_created,
  round(
    count(*) filter (where t.work_type = 'adhoc')::numeric
    / nullif(count(*), 0) * 100, 1
  )                                                               as adhoc_pct
from tasks t
join projects p on p.id = t.project_id
where t.is_archived = false
group by p.workspace_id, t.project_id, date_trunc('week', t.created_at);

-- ---------------------------------------------------------------------
-- 11. Row Level Security
-- ---------------------------------------------------------------------

alter table profiles             enable row level security;
alter table workspaces           enable row level security;
alter table workspace_members    enable row level security;
alter table projects             enable row level security;
alter table project_members      enable row level security;
alter table workflow_statuses    enable row level security;
alter table labels               enable row level security;
alter table recurrence_templates enable row level security;
alter table tasks                enable row level security;
alter table task_labels          enable row level security;
alter table task_checklist_items enable row level security;
alter table task_comments        enable row level security;
alter table time_entries         enable row level security;
alter table task_activity        enable row level security;

-- Profiles: everyone in a shared workspace can see each other.
create policy profiles_select on profiles for select using (
  id = auth.uid()
  or exists (
    select 1
    from workspace_members m1
    join workspace_members m2 on m1.workspace_id = m2.workspace_id
    where m1.user_id = auth.uid() and m2.user_id = profiles.id
  )
);
create policy profiles_update on profiles for update using (id = auth.uid());

-- Workspaces
create policy workspaces_select on workspaces for select
  using (is_workspace_member(id));
create policy workspaces_insert on workspaces for insert
  with check (created_by = auth.uid());
create policy workspaces_update on workspaces for update
  using (has_workspace_role(id, '{owner,admin}'));

-- Membership
create policy members_select on workspace_members for select
  using (is_workspace_member(workspace_id));
create policy members_write on workspace_members for all
  using (has_workspace_role(workspace_id, '{owner,admin}'))
  with check (has_workspace_role(workspace_id, '{owner,admin}'));

-- Projects
create policy projects_select on projects for select
  using (is_workspace_member(workspace_id));
create policy projects_write on projects for all
  using (has_workspace_role(workspace_id, '{owner,admin,member}'))
  with check (has_workspace_role(workspace_id, '{owner,admin,member}'));

-- Helper: does the current user have access to this project?
create or replace function can_access_project(p_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from projects p
    where p.id = p_id and is_workspace_member(p.workspace_id)
  );
$$;

-- Project-scoped tables share one shape of policy.
create policy project_members_all on project_members for all
  using (can_access_project(project_id)) with check (can_access_project(project_id));

create policy statuses_all on workflow_statuses for all
  using (can_access_project(project_id)) with check (can_access_project(project_id));

create policy labels_all on labels for all
  using (can_access_project(project_id)) with check (can_access_project(project_id));

create policy templates_all on recurrence_templates for all
  using (can_access_project(project_id)) with check (can_access_project(project_id));

create policy tasks_all on tasks for all
  using (can_access_project(project_id)) with check (can_access_project(project_id));

-- Task-scoped tables
create or replace function can_access_task(t_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from tasks t
    where t.id = t_id and can_access_project(t.project_id)
  );
$$;

create policy task_labels_all on task_labels for all
  using (can_access_task(task_id)) with check (can_access_task(task_id));

create policy checklist_all on task_checklist_items for all
  using (can_access_task(task_id)) with check (can_access_task(task_id));

create policy comments_select on task_comments for select
  using (can_access_task(task_id));
create policy comments_insert on task_comments for insert
  with check (can_access_task(task_id) and author_id = auth.uid());
create policy comments_modify on task_comments for update
  using (author_id = auth.uid());
create policy comments_delete on task_comments for delete
  using (author_id = auth.uid());

create policy time_select on time_entries for select
  using (can_access_task(task_id));
create policy time_write on time_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and can_access_task(task_id));

create policy activity_select on task_activity for select
  using (can_access_task(task_id));
create policy activity_insert on task_activity for insert
  with check (can_access_task(task_id));

-- ---------------------------------------------------------------------
-- 12. Realtime (for live board sync in M6)
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table task_comments;
