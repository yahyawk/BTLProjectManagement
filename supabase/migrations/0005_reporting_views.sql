-- =====================================================================
-- 0005 — Reporting views: RLS, subtask hours, NULL-safe maths
--
-- Fixes known issues #2, #3 and #7 (CLAUDE.md §8). All three live in the
-- three reporting views, which M5 is the first milestone to actually read.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Issue #2 — SECURITY: the views bypass RLS.
--
-- A Postgres view executes with the privileges of its OWNER unless it is
-- created with security_invoker. These views are owned by postgres, so
-- `select * from v_workload_weekly` returned EVERY workspace's workload to
-- ANY authenticated user — the Supabase advisor flags all three at ERROR
-- level, and it directly contradicts spec.md §9 ("RLS on every table, no
-- exceptions").
--
-- With security_invoker = on, the underlying tasks/projects/profiles
-- policies apply to the caller, so a view row is only visible to someone
-- who could already read the rows behind it.
-- ---------------------------------------------------------------------

-- v_workload_weekly is rebuilt below, so drop it before replacing its source.
drop view if exists v_workload_weekly;

-- ---------------------------------------------------------------------
-- Issue #3 — subtask estimates silently vanished.
--
-- 0001 filtered `parent_task_id is null` with the comment "subtask hours
-- roll up into the parent". Nothing rolled them up: the parent's estimate is
-- an independent column, so a subtask's hours were simply dropped. M3 made
-- this reachable by giving subtasks their own assignee and estimate.
--
-- Decision: count every task's own estimate, subtasks included.
-- spec.md §5.3 defines planned hours as the estimates of tasks "assigned to
-- them", and a subtask can be assigned to someone other than its parent's
-- assignee — rolling up would credit the wrong person.
--
-- Consequence to be aware of: estimating BOTH a parent and its subtasks
-- counts the work twice. Estimate at one level or the other.
-- ---------------------------------------------------------------------
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
  and s.category not in ('done', 'cancelled');

-- ---------------------------------------------------------------------
-- Issue #7 — NULL-safe aggregation.
--
-- `sum(x) filter (where ...)` returns NULL, not 0, when no row matches — so
-- someone with only recurring work had adhoc_hours = NULL, and NULL formats
-- as blank and poisons any arithmetic downstream. adhoc_ratio additionally
-- divides by planned_hours, which is 0 for a person whose tasks carry no
-- estimates.
--
-- Everything is coalesced here so the UI never has to. adhoc_ratio_pct is
-- new: spec.md §5.3 defines it but 0001 never exposed it.
-- ---------------------------------------------------------------------
create view v_workload_weekly as
select
  l.workspace_id,
  l.assignee_id,
  pr.full_name,
  pr.weekly_capacity_hours                                               as capacity_hours,
  l.week_start,
  coalesce(sum(l.estimate_hours), 0)                                     as planned_hours,
  coalesce(sum(l.estimate_hours) filter (where l.work_type = 'recurring'), 0)
                                                                         as recurring_hours,
  coalesce(sum(l.estimate_hours) filter (where l.work_type = 'adhoc'), 0)
                                                                         as adhoc_hours,
  count(*)                                                               as task_count,
  count(*) filter (where l.work_type = 'adhoc')                          as adhoc_task_count,
  coalesce(
    round(sum(l.estimate_hours) / nullif(pr.weekly_capacity_hours, 0) * 100, 1),
    0
  )                                                                      as utilization_pct,
  coalesce(
    round(
      sum(l.estimate_hours) filter (where l.work_type = 'adhoc')
      / nullif(sum(l.estimate_hours), 0) * 100,
      1
    ),
    0
  )                                                                      as adhoc_ratio_pct
from v_task_load l
join profiles pr on pr.id = l.assignee_id
where l.assignee_id is not null
group by l.workspace_id, l.assignee_id, pr.full_name,
         pr.weekly_capacity_hours, l.week_start;

-- ---------------------------------------------------------------------
-- Same NULL-safety for the ad-hoc trend.
-- ---------------------------------------------------------------------
create or replace view v_adhoc_ratio_weekly as
select
  p.workspace_id,
  t.project_id,
  date_trunc('week', t.created_at)::date                          as week_start,
  count(*)                                                        as tasks_created,
  count(*) filter (where t.work_type = 'adhoc')                   as adhoc_created,
  coalesce(
    round(
      count(*) filter (where t.work_type = 'adhoc')::numeric
      / nullif(count(*), 0) * 100, 1
    ),
    0
  )                                                               as adhoc_pct
from tasks t
join projects p on p.id = t.project_id
where t.is_archived = false
group by p.workspace_id, t.project_id, date_trunc('week', t.created_at);

-- ---------------------------------------------------------------------
-- The actual fix for #2. Must come after the views exist.
-- ---------------------------------------------------------------------
alter view v_task_load          set (security_invoker = on);
alter view v_workload_weekly    set (security_invoker = on);
alter view v_adhoc_ratio_weekly set (security_invoker = on);

grant select on v_task_load, v_workload_weekly, v_adhoc_ratio_weekly to authenticated;
