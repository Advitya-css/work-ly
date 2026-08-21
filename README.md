# Workly — AI Career Intelligence Platform

Phase 1: foundation. Project scaffold, design system, navigation, authentication, and the
database foundation for the career intelligence platform described in the project brief. No AI
features, CV parsing, or job matching are implemented yet — those are explicitly deferred to
later phases.

## Tech stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict), Tailwind CSS v4
- **UI**: hand-built shadcn/ui-style component set on Radix UI primitives + lucide-react icons
- **Backend**: Next.js Server Actions + Route Handlers
- **Database**: PostgreSQL + Prisma (schema is the source of truth — see note below on the query
  layer actually used in this phase)
- **Auth**: pluggable provider abstraction; local email/password by default, Supabase Auth ready
  to activate
- **AI / Storage / Job sources / Search / Scoring**: clean interfaces in `src/lib/*`, stubbed —
  nothing calls a real model or external service yet

## Getting started (open this in VS Code)

1. Unzip the project and open the folder in VS Code.
2. Install a local PostgreSQL server if you don't already have one (macOS: `brew install
   postgresql@16 && brew services start postgresql@16`; or use Postgres.app, Docker, or a hosted
   instance like Supabase — anything works, you just need a connection string).
3. Create a database and copy the env file:
   ```bash
   createdb workly_dev
   cp .env.example .env
   ```
   Edit `.env` if your Postgres isn't on `localhost:5432` with the default `postgres` user — the
   default `DATABASE_URL` in `.env.example` matches a fresh local install.
4. Install dependencies:
   ```bash
   npm install
   ```
   This automatically runs `npx prisma generate` via the `postinstall` script.
5. Create the database tables:
   ```bash
   npx prisma migrate deploy
   ```
6. Run the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

Useful scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run format`, `npm run
db:studio` (Prisma Studio, once `prisma generate` has run).

## Why there's a "real Prisma Client" and an "interim query layer"

This project was built inside a sandboxed environment whose network policy blocks
`binaries.prisma.sh`, the CDN Prisma's CLI downloads its schema/query engine from. That means
`npx prisma generate` could not be run there, so the app code in this phase reads/writes the
database through a small hand-typed query layer over `pg` instead (`src/lib/db/pool.ts`,
`users.ts`, `career-profile.ts`, `career-goals.ts`), matching the exact tables defined in
`prisma/schema.prisma`.

**This is a sandbox-only limitation, not a limitation of the code you're getting.** On your own
machine, `npm install` will run `prisma generate` successfully (step 4 above), and
`src/lib/db/prisma.ts` has the real, ready-to-use `PrismaClient` (via `@prisma/adapter-pg`) set up
and waiting. Swapping a call site from the interim layer to the real client is a one-line import
change — nothing about the schema or migrations needs to change either way, since both read the
same tables. `prisma/schema.prisma` remains the single source of truth for the data model.

The one migration in `prisma/migrations/20260817000000_init/` was hand-written to exactly match
`schema.prisma` (for the same reason — `prisma migrate dev` needs the same blocked engine). It's a
completely normal migration file; `npx prisma migrate deploy` will apply it like any other.

## Auth

Two `AuthProvider` implementations exist behind one interface (`src/lib/auth/`):

- **`local`** (default) — email/password against the `users` table, bcrypt-hashed, JWT session
  cookie (via `jose`). Works out of the box, no external account needed.
- **`supabase`** — real Supabase Auth via `@supabase/ssr`. Not exercised in this phase (no
  Supabase project connected), but implemented against the real APIs. Activate by setting
  `AUTH_PROVIDER=supabase` and the three Supabase env vars in `.env`.

Route protection is enforced in `src/proxy.ts` (Next.js 16 renamed the `middleware.ts` convention
to `proxy.ts`; functionally the same thing) for every route under the main app shell, plus
redirecting signed-in users away from `/login` and `/signup`.

## AI, storage, job sources, search, scoring

Each lives behind an interface in `src/lib/{ai,storage,jobs,search,scoring}/`, with a stub (or, for
AI, a real OpenAI-compatible implementation that just isn't wired to any call site yet) as the
active implementation. No page in this phase calls any of them — see "What's deferred" below.
`AI_PROVIDER=openai-compatible` plus `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL` in `.env` will activate
the real AI provider once a later phase starts using it (OpenRouter, OpenAI, or any
OpenAI-compatible endpoint all work — see `.env.example`).

## Project structure

```
prisma/                    schema.prisma (source of truth) + the one hand-authored migration
src/
  app/
    page.tsx                landing page
    (auth)/login, signup    centered auth layout, no sidebar
    onboarding/              standalone post-signup flow
    (app)/                   protected app shell (sidebar) — dashboard, opportunities,
                              career-profile, career-goals, dream-job, career-path,
                              applications, settings
  components/
    ui/                      design system primitives (button, card, dialog, tabs, ...)
    layout/                  sidebar, mobile nav, app shell, user menu
    marketing/                landing page sections
    shared/                   empty state, page header, logo
    career/, settings/, auth/ feature-specific forms
  lib/
    auth/                    provider abstraction, session, server actions
    db/                      interim pg query layer + the real Prisma client (see above)
    ai/, storage/, jobs/, search/, scoring/   abstractions for later phases
    validations/              zod schemas
  proxy.ts                   route protection (formerly middleware.ts)
```

## Environment variables

See `.env.example` for the full list with comments. Nothing is hard-coded — every secret and
provider choice is an env var.

## What's intentionally deferred

Per the project brief, this phase does **not** implement: CV upload/parsing, job discovery,
semantic matching, opportunity prioritization/scoring, gap analysis, pathway generation, or
application outcome tracking. The corresponding nav pages (Opportunities, Dream Job, Career Path,
Applications) render honest empty states explaining what's coming rather than placeholder or fake
data — consistent with the product principle of never inventing information the system doesn't
actually have.

The `prisma/schema.prisma` file documents the future models (Opportunity, Application, SkillGap,
etc.) in a comment block, but none of them are implemented yet.

## Tests performed

- `npm run lint` — clean
- `npm run typecheck` — clean
- `npm run build` — clean production build, all 12 app routes compile
- End-to-end flow tested with Playwright against a running dev server: sign up → onboarding →
  dashboard → fill & save career profile → create a career goal → dashboard reflects both → sign
  out → confirm `/dashboard` redirects to `/login` when signed out → confirm `/login` redirects to
  `/dashboard` when already signed in. Zero console/page errors across the run.
- Visual check at desktop (1440px), tablet (820px), and mobile (390px) viewports for the landing
  page and the app shell, including the mobile nav drawer.
# work-ly
