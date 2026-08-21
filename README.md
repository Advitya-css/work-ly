# Workly

Workly is a real career-intelligence app: CV ingest, fit scoring, job discovery, dream-job gaps, pathways, applications, and a student mode.

## Architecture & Stack
- **Framework:** Next.js 16 App Router (React 19)
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (raw `pg` pool used for all queries)
- **Authentication:** Local JWT (or Supabase ready)
- **AI/Parsing:** Deterministic scoring with optional OpenAI-compatible AI endpoints (Gemini).

## Features (Phase 8 Complete)
- **Job Discovery & Matching:** Import jobs, discover feeds, deterministic fit and priority scoring.
- **Career Pathways:** Identify gaps, view pathways, set career goals.
- **Student Shell:** Country-sourced work-hour notes and constraints.
- **Applications:** Track opportunities and application statuses.

## Local Development
1. `npm install`
2. `npm run setup` to start the PostgreSQL container and run migrations
3. `npm run dev` to start the development server

## Environment Variables
Review `.env.example` to see required variables. Ensure `DATABASE_URL` is set to a valid PostgreSQL instance.
