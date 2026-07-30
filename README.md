# Teamflow

Team work-tracking that makes the split between **recurring** and **ad-hoc**
work a first-class concept, so a lead can see where capacity actually goes.

- `spec.md` — product spec and milestone plan (source of truth)
- `CLAUDE.md` — engineering conventions
- `schema.sql` / `supabase/migrations/0001_init.sql` — database

## Status

**M0 — Foundation.** Next.js 15 + Tailwind v4 + Supabase scaffold, schema
applied, generated types, email/password auth with a protected app shell.

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
for Preview and Production, or the deployed app cannot reach Supabase.

## Scripts

| Script | Does |
|---|---|
| `npm run build` | Production build — the gate before every commit |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
