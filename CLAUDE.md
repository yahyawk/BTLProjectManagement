# CLAUDE.md — Teamflow project conventions

Read this **and** `spec.md` at the start of every session. `spec.md` is the
source of truth for *what* to build; this file is the source of truth for *how*.

---

## 1. What this app is

A team work-tracker whose differentiator is that every task is either
`recurring` (predictable, auto-generated) or `adhoc` (an interrupt). The
headline question it answers: *"how much of my team's capacity is unplanned
work eating, and who is over capacity this week?"*

If a change makes `work_type` easier to ignore or default, it is wrong.

---

## 2. Stack — do not add to this without asking

Locked by `spec.md` §7:

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript, strict |
| Styling | Tailwind CSS v4 (CSS-first config in `app/globals.css`) |
| Components | shadcn/ui — **not yet installed**, see §9 |
| Backend | Supabase (Postgres 17, Auth, RLS, Realtime) |
| Drag & drop | `@dnd-kit/core` (M2) |
| Server state | TanStack Query (M2+) |
| Dates | `date-fns` (M4+) |
| Validation | Zod v4 |
| Hosting | Vercel |

**Installed so far:** `next`, `react`, `react-dom`, `@supabase/supabase-js`,
`@supabase/ssr`, `zod`, `tailwindcss`, `typescript`, `eslint-config-next`.

`@supabase/ssr` was approved as part of "Supabase" — it is the cookie/session
adapter for the App Router. **Every other package needs explicit sign-off from
the user before `npm install`.** That includes transitive-looking things like
`clsx` or `lucide-react`.

---

## 3. Environment & secrets

- `.env.local` is gitignored and **must stay that way**. `.env.example`
  documents the variable names only, never values.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe in the
  browser; they are only as powerful as RLS allows.
- `SUPABASE_SERVICE_ROLE_KEY` **bypasses RLS**. It arrives in M4 and may be read
  in exactly one place: `app/api/cron/generate-recurring/route.ts`. Never import
  it from `/lib/supabase/client.ts`, never from anything under `/components`.
- Never paste a real key into source, a comment, a commit message, or a PR body.

Env is read through `lib/env.ts`, which validates lazily with Zod so
`next build` stays green on a machine with no env file.

---

## 4. Folder structure

```
/app
  layout.tsx                  root shell + globals.css
  globals.css                 Tailwind v4 entry + @theme tokens
  /(auth)                     public routes; redirects to / when signed in
    actions.ts                'use server' — login / signup / signout
    /login, /signup
  /(app)                      protected shell; getUser() guard in layout.tsx
    page.tsx                  workspace home  (/)
    /projects/[projectId]/{board,list,recurring,settings}   (M1–M4)
    /my-tasks, /workload, /reports                          (M3–M5)
  /api/cron/generate-recurring/route.ts                     (M4)
/components
  /ui                         shared primitives
  /board, /workload           feature components (M2, M5)
/lib
  env.ts                      Zod-validated env access
  types.ts                    hand-written aliases over generated types
  database.types.ts           GENERATED — do not hand-edit
  /supabase                   client.ts (browser), server.ts, middleware.ts
  /queries                    ALL data access, one file per entity
  recurrence.ts               computeNextOccurrence()                (M4)
/supabase/migrations          numbered SQL, applied in order
middleware.ts                 session refresh + route protection
```

Route params use `[projectId]`, not `[id]` (`spec.md` §6 and §7 disagree; §7
wins). Import with the `@/` alias, never `../../..`.

---

## 5. Data access rules — the important ones

1. **Every read and write goes through `/lib/queries`.** No `supabase.from(...)`
   anywhere under `/app` or `/components`. One file per entity:
   `profiles.ts`, `workspaces.ts`, `projects.ts`, `tasks.ts`, …
2. **Every write validates its input with Zod first.** Parse `unknown`, never
   trust a `FormData` shape. Export the schema so forms can reuse it.
3. **Every query function returns `QueryResult<T>`** (`lib/types.ts`) — never
   throw a raw Postgres error into a component, and never leak `error.message`
   from a constraint violation straight to the user without reading it first.
4. **Never create a module-level Supabase client on the server.** Call
   `await createClient()` per request or requests will share auth cookies.
5. **RLS is the security boundary, not the UI.** Hiding a button is not access
   control. When a milestone adds a table, verify its policy by querying as a
   non-member before calling the milestone done (`spec.md` §9).
6. **Let the database do what it already does.** Triggers own `profiles`
   creation, `tasks.ref`, `completed_at`, and default `workflow_statuses` —
   do not reimplement any of that in TypeScript.
7. Regenerate `lib/database.types.ts` after every migration. Never hand-edit it.

---

## 6. Migrations

- Numbered, immutable, append-only: `supabase/migrations/000N_name.sql`.
- `0001_init.sql` is `schema.sql` verbatim. Do not edit it — fix forward.
- Applied to the Supabase project via the MCP `apply_migration` tool.
- After applying, run the security advisor and record anything new in §8.

---

## 7. Build order & verification

One milestone per session, in `spec.md` §8 order. **Never skip ahead**, and
never start M[n] before M[n-1] is verified.

The user has no local dev server (Claude Code on the web). So the "runs
locally" gate in `spec.md` §8 is replaced everywhere by:

> **`npm run build` passes, the branch is pushed, and the Vercel preview
> deployment succeeds** — plus a short click-path the user can follow on the
> preview URL to confirm the milestone's "done when".

Every milestone must therefore end in a state that builds cleanly. Run
`npm run build` (not just `tsc --noEmit`) before committing — `typedRoutes` and
the client/server boundary only fail at build time.

---

## 8. Known issues in the shipped schema

Logged deliberately rather than silently patched. Fix each in the milestone
where it first matters, as a new numbered migration.

| # | Issue | Fix at |
|---|---|---|
| 1 | ~~First `workspace_members` insert is impossible.~~ **Fixed in `0002`** by `create_workspace_with_owner()`. A second RPC, `add_workspace_member_by_email()`, covers the related gap that `profiles_select` hides the invitee from the inviter. | ✅ M1 |
| 2 | **The three reporting views bypass RLS** (`security_definer_view`, ERROR-level in the Supabase advisor). Any signed-in user can read every workspace's workload. Needs `alter view … set (security_invoker = on)`. | **M5 — security** |
| 3 | `v_task_load` filters `parent_task_id is null` claiming subtask hours "roll up", but nothing rolls them up — subtask estimates vanish from Workload. | M3/M5 |
| 4 | `next_run_at` is ambiguous: §5.1 advances it to the occurrence date, which makes `lead_time_days` a no-op. Agreed reading: it holds the **occurrence** date; generate when `next_run_at - lead_time_days <= current_date`. | M4 |
| 5 | `/tasks/[ref]` is not globally unique — `ref` is unique per *project*. Needs project scoping. | M2 |
| 6 | `assign_task_ref()` is not `security definer`, so inserting a task silently requires UPDATE on `projects`. A `viewer` passes the `tasks` policy but the trigger then writes a NULL `ref`. | M2 |
| 7 | `sum(...) filter` returns NULL (not 0) with no matching rows, and `adhoc_ratio` divides by a possibly-zero `planned_hours`. Coalesce in the query layer. | M5 |
| 8 | `alter publication supabase_realtime add table …` is not idempotent — it errors on replay. | M6 |
| 9 | `seed_default_statuses`, `assign_task_ref`, `sync_task_completion` have mutable `search_path` (advisor WARN). | M6 |

---

### Security-definer RPC rules

`0002` introduces the first RPCs that bypass RLS. Any future one must:

1. `security definer set search_path = public` — never a mutable search_path.
2. Do its **own** authorization check in the body (`has_workspace_role(...)`),
   because RLS is not applied. Skipping this is a privilege-escalation hole.
3. `revoke execute ... from public, anon` and `grant execute ... to authenticated`.
4. Prefix plpgsql locals with `v_`. A variable named after a column (`slug`)
   silently shadows it and raises `42702` at runtime, not at deploy time.

---

## 9. UI conventions

- shadcn/ui is the target per §7 but is **not installed** — it needs
  `clsx`, `tailwind-merge`, `class-variance-authority` and Radix, which the user
  has not approved. M0 ships hand-rolled primitives in `components/ui/field.tsx`.
  **Ask before installing shadcn at M2**, then migrate those primitives.
- Ad-hoc tasks must be visually distinct from recurring ones everywhere they
  appear (`spec.md` §5.2). Tokens live in `@theme`: `--color-adhoc`,
  `--color-recurring`.
- Prefer Server Components. Add `'use client'` only for interactivity, and push
  it as far down the tree as possible.
- Mutations use Server Actions calling `/lib/queries`, not route handlers.

---

## 10. Git

- Branch: `claude/app-setup-m0-85feb5`. Never push elsewhere without asking.
- **One commit per milestone**, message names the milestone:
  `M0 — Foundation: Next.js + Supabase scaffold, auth, protected layout`
- Never commit `.env.local`, real keys, or `node_modules`.
- Do not open a PR unless the user asks.
