-- =====================================================================
-- Demo seed data
--
-- spec.md §9: "Seed data must include both recurring and ad-hoc tasks across
-- at least three people and four weeks, or the workload view can't be
-- evaluated."
--
-- Everything lands in a dedicated "BTL Demo" workspace with a fixed id,
-- so it never mixes with real data and teardown is exact. Your own account is
-- added as its owner, so it shows up in the workspace switcher on `/`.
--
-- Run as postgres / service_role — it writes to auth.users, which the app
-- itself can never do. Idempotent: re-running replaces the demo cleanly.
--
-- TEARDOWN (removes exactly this and nothing else):
--   delete from workspaces where id = 'd0000000-0000-4000-8000-00000000000a';
--   delete from auth.users where email like '%@demo.invalid';
--
-- @demo.invalid uses the reserved .invalid TLD (RFC 2606) — those addresses
-- can never resolve, so no real inbox can ever be hit.
-- =====================================================================

-- --- Idempotency: clear any previous run --------------------------------
delete from workspaces where id = 'd0000000-0000-4000-8000-00000000000a';
delete from auth.users where email like '%@demo.invalid';

-- --- Three demo people --------------------------------------------------
-- handle_new_user() creates the matching profiles rows.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('d0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','priya@demo.invalid','!seed-no-login!',
   now(), now(), now(), '{}'::jsonb, '{"full_name":"Priya Raman"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','marcus@demo.invalid','!seed-no-login!',
   now(), now(), now(), '{}'::jsonb, '{"full_name":"Marcus Bell"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','ana@demo.invalid','!seed-no-login!',
   now(), now(), now(), '{}'::jsonb, '{"full_name":"Ana Silva"}'::jsonb);

-- Varied capacity so the Workload view has something to say. Priya is
-- part-time, which is what makes her tip over on a heavy week.
update profiles set weekly_capacity_hours = 24, job_title = 'Ops analyst (part-time)'
  where id = 'd0000000-0000-4000-8000-000000000001';
update profiles set weekly_capacity_hours = 40, job_title = 'Platform engineer'
  where id = 'd0000000-0000-4000-8000-000000000002';
update profiles set weekly_capacity_hours = 32, job_title = 'Support lead'
  where id = 'd0000000-0000-4000-8000-000000000003';

-- --- Workspace ----------------------------------------------------------
insert into workspaces (id, name, slug, created_by)
values ('d0000000-0000-4000-8000-00000000000a', 'BTL Demo', 'btl-demo',
        'd0000000-0000-4000-8000-000000000001');

-- The real account (earliest non-demo profile) owns it so it is visible in
-- the app; falls back to a demo user on a database with no real users yet.
insert into workspace_members (workspace_id, user_id, role)
select 'd0000000-0000-4000-8000-00000000000a',
       coalesce(
         (select id from profiles where email not like '%@demo.invalid' order by created_at limit 1),
         'd0000000-0000-4000-8000-000000000001'
       ),
       'owner'
on conflict do nothing;

insert into workspace_members (workspace_id, user_id, role) values
  ('d0000000-0000-4000-8000-00000000000a','d0000000-0000-4000-8000-000000000001','admin'),
  ('d0000000-0000-4000-8000-00000000000a','d0000000-0000-4000-8000-000000000002','member'),
  ('d0000000-0000-4000-8000-00000000000a','d0000000-0000-4000-8000-000000000003','member')
on conflict (workspace_id, user_id) do nothing;

-- --- Two projects (on_project_created seeds their columns) --------------
insert into projects (id, workspace_id, name, key, color, description, created_by) values
  ('d0000000-0000-4000-8000-0000000000b1','d0000000-0000-4000-8000-00000000000a',
   'Operations','OPS','#6366f1','Recurring reporting and the interrupts that eat it',
   'd0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-0000000000b2','d0000000-0000-4000-8000-00000000000a',
   'Customer Support','SUP','#f97316','Escalations and the routines around them',
   'd0000000-0000-4000-8000-000000000003');

-- --- Labels -------------------------------------------------------------
insert into labels (id, project_id, name, color) values
  ('d0000000-0000-4000-8000-0000000000c1','d0000000-0000-4000-8000-0000000000b1','Reporting','#3b82f6'),
  ('d0000000-0000-4000-8000-0000000000c2','d0000000-0000-4000-8000-0000000000b1','Incident','#ef4444'),
  ('d0000000-0000-4000-8000-0000000000c3','d0000000-0000-4000-8000-0000000000b2','Escalation','#f97316'),
  ('d0000000-0000-4000-8000-0000000000c4','d0000000-0000-4000-8000-0000000000b2','Routine','#22c55e');

-- --- Tasks --------------------------------------------------------------
-- Spread over four weeks around today, so the Workload grid is populated on
-- whatever day this runs. `created_at` is set explicitly and spread backwards
-- as well, because /reports buckets the ad-hoc trend by creation week.
--
-- `ref` is passed as '' and overwritten by assign_task_ref.
insert into tasks (project_id, status_id, title, work_type, priority, assignee_id,
                   estimate_hours, due_date, requested_by, source_note,
                   position, ref, created_at, created_by)
select
  p.id,
  (select s.id from workflow_statuses s
    where s.project_id = p.id and s.name = t.status_name),
  t.title, t.work_type::work_type, t.priority::priority_level, t.assignee::uuid,
  t.estimate,
  date_trunc('week', current_date)::date + t.week_offset * 7 + t.day_offset,
  t.requested_by, t.source_note,
  1024 * row_number() over (partition by p.id, t.status_name order by t.title),
  '',
  now() - make_interval(days => t.created_days_ago),
  'd0000000-0000-4000-8000-000000000001'
from (values
  -- project key, column,        title,                                        type,        priority, assignee,                               est,  wk, day, requested_by,      source_note,                              created_days_ago
  ('OPS','In Progress','Weekly ops report',                        'recurring','medium','d0000000-0000-4000-8000-000000000001', 4.0, 0, 0, null, null, 21),
  ('OPS','Backlog',    'Month-end close checklist',                'recurring','high',  'd0000000-0000-4000-8000-000000000001', 8.0, 0, 3, null, null, 20),
  ('OPS','In Progress','Vendor invoice reconciliation',            'recurring','medium','d0000000-0000-4000-8000-000000000002', 6.0, 0, 1, null, null, 19),
  ('OPS','Backlog',    'Finance asked for a Q3 spend breakdown',   'adhoc',    'urgent','d0000000-0000-4000-8000-000000000001',12.0, 0, 2, 'Finance — Dana',  'Board pack deadline moved up a week',      6),
  ('OPS','Backlog',    'Rebuild the broken metrics pipeline',      'adhoc',    'high',  'd0000000-0000-4000-8000-000000000002', 9.0, 0, 4, 'Data — Sam',      'Nightly job has been failing since Tuesday', 4),
  ('OPS','Backlog',    'Weekly ops report (wk1)',                'recurring','medium','d0000000-0000-4000-8000-000000000001', 4.0, 1, 0, null, null, 21),
  ('OPS','Backlog',    'Quarterly access review',                  'recurring','high',  'd0000000-0000-4000-8000-000000000003', 6.0, 1, 2, null, null, 18),
  ('OPS','Backlog',    'Sales wants a custom export',              'adhoc',    'medium','d0000000-0000-4000-8000-000000000003', 5.0, 1, 3, 'Sales — Priya K', 'Acme renewal call on Friday',              3),
  ('OPS','Backlog',    'Weekly ops report (wk2)',                'recurring','medium','d0000000-0000-4000-8000-000000000001', 4.0, 2, 0, null, null, 21),
  ('OPS','Backlog',    'Migrate the reporting warehouse',          'recurring','low',   'd0000000-0000-4000-8000-000000000002',16.0, 2, 1, null, null, 14),
  ('OPS','Backlog',    'Weekly ops report (wk3)',                'recurring','medium','d0000000-0000-4000-8000-000000000001', 4.0, 3, 0, null, null, 21),
  ('OPS','Backlog',    'Audit prep pack',                          'recurring','medium','d0000000-0000-4000-8000-000000000003', 8.0, 3, 2, null, null, 12),
  ('OPS','Done',       'Last month close',                         'recurring','medium','d0000000-0000-4000-8000-000000000001', 8.0, -1, 1, null, null, 30),
  ('OPS','Done',       'Urgent board data request',                'adhoc',    'urgent','d0000000-0000-4000-8000-000000000001', 6.0, -1, 2, 'Exec — Tom',      'Ahead of the investor update',             28),
  -- Customer Support
  ('SUP','In Progress','Daily queue triage',                       'recurring','high',  'd0000000-0000-4000-8000-000000000003', 5.0, 0, 0, null, null, 25),
  ('SUP','Backlog',    'Weekly CSAT summary',                      'recurring','low',   'd0000000-0000-4000-8000-000000000003', 2.0, 0, 4, null, null, 24),
  ('SUP','In Review',  'Acme outage post-mortem',                  'adhoc',    'urgent','d0000000-0000-4000-8000-000000000002', 8.0, 0, 1, 'Acme (customer)', 'Sev-1 on Monday, RCA promised in 5 days',   2),
  ('SUP','Backlog',    'Escalation: duplicate billing',            'adhoc',    'high',  'd0000000-0000-4000-8000-000000000001', 6.0, 0, 3, 'Support — Jo',    'Three customers hit the same bug',          1),
  ('SUP','Backlog',    'Daily queue triage (wk1)',               'recurring','high',  'd0000000-0000-4000-8000-000000000003', 5.0, 1, 0, null, null, 25),
  ('SUP','Backlog',    'Refresh the support macros',               'recurring','low',   'd0000000-0000-4000-8000-000000000002', 4.0, 1, 4, null, null, 16),
  ('SUP','Backlog',    'Daily queue triage (wk2)',               'recurring','high',  'd0000000-0000-4000-8000-000000000003', 5.0, 2, 0, null, null, 25),
  ('SUP','Backlog',    'Onboarding docs refresh',                  'recurring','medium','d0000000-0000-4000-8000-000000000001', 3.0, 2, 2, null, null, 11),
  ('SUP','Backlog',    'Daily queue triage (wk3)',               'recurring','high',  'd0000000-0000-4000-8000-000000000003', 5.0, 3, 0, null, null, 25),
  ('SUP','Backlog',    'Partner integration questions',            'adhoc',    'medium','d0000000-0000-4000-8000-000000000002', 4.0, 3, 1, 'Partnerships',    'Recurring questions from the Beta partner',  9),
  ('SUP','Done',       'Migrate help centre theme',                'recurring','low',   'd0000000-0000-4000-8000-000000000002', 6.0, -2, 3, null, null, 35)
) as t(project_key, status_name, title, work_type, priority, assignee, estimate,
       week_offset, day_offset, requested_by, source_note, created_days_ago)
join projects p on p.key = t.project_key
              and p.workspace_id = 'd0000000-0000-4000-8000-00000000000a';

-- --- Labels on tasks ----------------------------------------------------
insert into task_labels (task_id, label_id)
select t.id, 'd0000000-0000-4000-8000-0000000000c1'
from tasks t where t.project_id = 'd0000000-0000-4000-8000-0000000000b1'
  and t.title ilike '%report%'
on conflict do nothing;

insert into task_labels (task_id, label_id)
select t.id, 'd0000000-0000-4000-8000-0000000000c2'
from tasks t where t.project_id = 'd0000000-0000-4000-8000-0000000000b1'
  and t.work_type = 'adhoc'
on conflict do nothing;

insert into task_labels (task_id, label_id)
select t.id, 'd0000000-0000-4000-8000-0000000000c3'
from tasks t where t.project_id = 'd0000000-0000-4000-8000-0000000000b2'
  and t.work_type = 'adhoc'
on conflict do nothing;

insert into task_labels (task_id, label_id)
select t.id, 'd0000000-0000-4000-8000-0000000000c4'
from tasks t where t.project_id = 'd0000000-0000-4000-8000-0000000000b2'
  and t.work_type = 'recurring'
on conflict do nothing;

-- --- A subtask, so the M5 attribution decision is visible ---------------
-- Assigned to someone OTHER than its parent's assignee: its hours land on
-- Marcus, not on Priya.
insert into tasks (project_id, parent_task_id, status_id, title, work_type, priority,
                   assignee_id, estimate_hours, due_date, position, ref, created_by)
select p.project_id, p.id,
       (select s.id from workflow_statuses s where s.project_id = p.project_id and s.name = 'Backlog'),
       'Pull the raw ledger extract', 'adhoc', 'high',
       'd0000000-0000-4000-8000-000000000002', 4.0, p.due_date, 1024, '',
       'd0000000-0000-4000-8000-000000000001'
from tasks p
where p.title = 'Finance asked for a Q3 spend breakdown';

-- --- Checklist, comments, time entries ----------------------------------
insert into task_checklist_items (task_id, content, is_done, position)
select t.id, c.content, c.done, c.pos
from tasks t
join (values
  ('Pull last week''s numbers', true, 1024),
  ('Sanity-check against the ledger', true, 2048),
  ('Write the summary', false, 3072),
  ('Send to the leads channel', false, 4096)
) as c(content, done, pos) on true
where t.title = 'Weekly ops report';

insert into task_comments (task_id, author_id, body)
select t.id, 'd0000000-0000-4000-8000-000000000002',
       'RCA draft is in the shared doc — I still need the timeline from the on-call log.'
from tasks t where t.title = 'Acme outage post-mortem';

insert into task_comments (task_id, author_id, body)
select t.id, 'd0000000-0000-4000-8000-000000000003',
       'Customer has been told Friday. Please flag early if that slips.'
from tasks t where t.title = 'Acme outage post-mortem';

-- Actual-vs-estimate: one task comfortably under, one over.
insert into time_entries (task_id, user_id, hours, entry_date, note)
select t.id, 'd0000000-0000-4000-8000-000000000001', 2.5, current_date - 1, 'Pulled the numbers'
from tasks t where t.title = 'Weekly ops report';

insert into time_entries (task_id, user_id, hours, entry_date, note)
select t.id, 'd0000000-0000-4000-8000-000000000002', 6.0, current_date - 2, 'Timeline reconstruction'
from tasks t where t.title = 'Acme outage post-mortem';

insert into time_entries (task_id, user_id, hours, entry_date, note)
select t.id, 'd0000000-0000-4000-8000-000000000002', 5.5, current_date - 1, 'Draft RCA — ran long'
from tasks t where t.title = 'Acme outage post-mortem';

-- --- Recurrence templates ----------------------------------------------
insert into recurrence_templates (project_id, title, description, default_assignee_id,
                                  priority, estimate_hours, frequency, interval_count,
                                  byweekday, start_date, lead_time_days, next_run_at, created_by)
values
  ('d0000000-0000-4000-8000-0000000000b1','Weekly ops report',
   'Numbers for the Monday leads meeting.','d0000000-0000-4000-8000-000000000001',
   'medium', 4.0, 'weekly', 1, '{1}'::smallint[],
   date_trunc('week', current_date)::date, 3,
   date_trunc('week', current_date)::date + 28, 'd0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-0000000000b2','Daily queue triage',
   'Clear the overnight support queue.','d0000000-0000-4000-8000-000000000003',
   'high', 5.0, 'weekly', 1, '{1,2,3,4,5}'::smallint[],
   date_trunc('week', current_date)::date, 1,
   date_trunc('week', current_date)::date + 28, 'd0000000-0000-4000-8000-000000000003');

insert into recurrence_templates (project_id, title, default_assignee_id, priority,
                                  estimate_hours, frequency, interval_count, bymonthday,
                                  start_date, lead_time_days, next_run_at, created_by)
values
  ('d0000000-0000-4000-8000-0000000000b1','Month-end close',
   'd0000000-0000-4000-8000-000000000001','high', 8.0, 'monthly', 1, -1,
   date_trunc('month', current_date)::date, 5,
   (date_trunc('month', current_date) + interval '1 month - 1 day')::date,
   'd0000000-0000-4000-8000-000000000001');
