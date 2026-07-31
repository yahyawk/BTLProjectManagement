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
`@supabase/ssr`, `zod`, `tailwindcss`, `typescript`, `eslint-config-next`,
`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

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
- `SUPABASE_SERVICE_ROLE_KEY` **bypasses RLS**. It is read in exactly one
  place: `app/api/cron/generate-recurring/route.ts`. Never import it from
  `/lib/supabase/client.ts`, never from anything under `/components`.
- `CRON_SECRET` guards that route. Vercel Cron sends it as
  `Authorization: Bearer $CRON_SECRET`. The check **fails closed**: if the
  variable is unset the route returns 401 rather than running unauthenticated.
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
  constants.ts                LEAF — palettes, POSITION_GAP
  dates.ts                    LEAF — isOverdue, formatDate, todayIso
  /supabase                   client.ts (browser), server.ts, middleware.ts
  /queries                    ALL data access, one file per entity
  recurrence.ts               computeNextOccurrence(), isDue() — pure
  recurrence.test.ts          node:test unit tests
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
8. **A `'use client'` module may only take *types* from `/lib/queries`.**
   Importing a value — even a plain constant — pulls `lib/supabase/server.ts`
   and therefore `next/headers` into the browser bundle, and the build fails.
   Shared constants go in `lib/constants.ts`, shared formatting in
   `lib/dates.ts`. Both are leaf modules with no Supabase import, on purpose.

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

`npm test` runs the pure-logic unit tests through Node's built-in runner with
native TypeScript stripping (Node 22+). No test framework is installed, and
none should be added without asking. Anything with date maths or money maths
belongs in a pure module with tests, not inside a component.

---

## 8. Known issues in the shipped schema

Logged deliberately rather than silently patched. Fix each in the milestone
where it first matters, as a new numbered migration.

| # | Issue | Fix at |
|---|---|---|
| 1 | ~~First `workspace_members` insert is impossible.~~ **Fixed in `0002`** by `create_workspace_with_owner()`. A second RPC, `add_workspace_member_by_email()`, covers the related gap that `profiles_select` hides the invitee from the inviter. | ✅ M1 |
| 2 | ~~The three reporting views bypass RLS.~~ **Fixed in `0005`** with `security_invoker = on`. All three ERROR-level advisor lints are gone; verified that a non-member reads 0 rows from every view. | ✅ M5 |
| 3 | ~~Subtask estimates vanished from Workload.~~ **Decided and fixed in `0005`**: the `parent_task_id is null` filter is gone, so every task counts its own estimate against its own assignee. A roll-up would have credited the parent's assignee for a subtask someone else owns. **Trade-off:** estimating a parent *and* its subtasks double-counts — estimate at one level. | ✅ M5 |
| 10 | ~~`can_access_project()`/`can_access_task()` were used as *write* gates on six tables, so a `viewer` could edit board columns, labels, templates, project members, task labels and checklist items.~~ **Fixed in `0004`** via `can_write_project()` / `can_write_task()`. Comments remain open to viewers deliberately. | ✅ M3 |
| 4 | ~~`next_run_at` is ambiguous.~~ **Settled in M4**: it holds the **occurrence** date, and `isDue()` fires when `next_run_at - lead_time_days <= current_date`. Comparing `next_run_at` to today directly would make `lead_time_days` a no-op. Covered by unit tests. | ✅ M4 |
| 5 | ~~`/tasks/[ref]` is not globally unique.~~ **Fixed in M2** — the route is `/projects/[projectId]/tasks/[ref]` and `getTaskByRef` filters on both. | ✅ M2 |
| 6 | ~~`assign_task_ref()` is not `security definer`.~~ **Fixed in `0003`**, which also split `tasks_all` into select/insert/update/delete so a `viewer` is genuinely read-only (`can_write_project`) rather than failing later on a NULL `ref`. | ✅ M2 |
| 7 | ~~`sum(...) filter` returns NULL, and `adhoc_ratio` divides by zero.~~ **Fixed in `0005`**: every aggregate is coalesced in the view and `adhoc_ratio_pct` is now exposed (0001 defined it in the spec but never built it). | ✅ M5 |
| 8 | `alter publication supabase_realtime add table …` is not idempotent — it errors on replay. | M6 |
| 9 | `seed_default_statuses` and `sync_task_completion` have mutable `search_path` (advisor WARN). Also revoke EXECUTE on the trigger functions — the advisor flags `assign_task_ref` as RPC-callable by `anon`, which is meaningless (it needs a trigger context) but should not be exposed. | M6 |

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

- shadcn/ui is the target per §7 but is **not installed** — the user declined
  its dependencies at M0 and again at M2. Primitives are hand-rolled in
  `components/ui/`. The task modal uses the native `<dialog>` element, which
  gives focus trapping, Esc-to-close and a top-layer backdrop for free — that
  is what made skipping a headless-UI dependency viable. Ask again only if the
  UI outgrows it.
- **Never interpolate Tailwind class names** (`` `border-${accent}` ``). Class
  extraction is static, so those silently produce no CSS. Write both branches
  out in full.
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
