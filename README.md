# Teamflow

Team work-tracking that makes the split between **recurring** and **ad-hoc**
work a first-class concept, so a lead can see where capacity actually goes.

- `spec.md` — product spec and milestone plan (source of truth)
- `CLAUDE.md` — engineering conventions
- `schema.sql` / `supabase/migrations/0001_init.sql` — database

## Status

**M0–M6 complete.** Auth and protected shell; workspaces, projects and
membership; kanban board with drag-and-drop and a deep-linkable task modal;
labels, dates, estimates, subtasks, checklists and comments; a unit-tested
recurrence engine with a cron generator; workload and ad-hoc reporting; time
entries, Realtime board sync, loading skeletons and error boundaries.

Six migrations are applied. `supabase/seed.sql` loads a demo workspace with
three people across four weeks.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in from Supabase → Settings → API
npm run build
```

Required environment variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These must also be set in Vercel → Project → Settings → Environment Variables
for **both Preview and Production**, or the deployed app cannot reach Supabase.

> **`NEXT_PUBLIC_*` values are inlined at build time.** Adding or changing them
> in the Vercel dashboard has no effect on deployments that already exist — a
> new build must run. Push a commit, or use Redeploy and confirm a *new*
> deployment ID appears. If middleware throws
> `MIDDLEWARE_INVOCATION_FAILED`, check the deployment ID first: if it is the
> same one as before, no rebuild happened.

## Scripts

| Script | Does |
|---|---|
| `npm run build` | Production build — the gate before every commit |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Pure-logic unit tests (Node's built-in runner) |
| `npm run lint` | ESLint |
