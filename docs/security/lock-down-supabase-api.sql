-- LOCK DOWN SUPABASE'S PUBLIC API (fixes "rls_disabled_in_public")
--
-- Work-ly talks to Postgres directly as the database owner (lib/db/pool.ts),
-- and file storage uses the service-role key. Neither is affected by Row
-- Level Security, so turning it on changes nothing for the app. What it
-- shuts is Supabase's automatic REST API, which otherwise lets anyone with
-- the project URL and the public "anon" key read and change every table.
--
-- Run once: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again.

-- 1. Row Level Security on every table, with no policies: the public API
--    roles (anon, authenticated) see nothing.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- 2. Belt and braces: the public API roles get no rights on these tables at
--    all, now or on tables created by later migrations.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 3. Check: every row should say true. Anything false is still open.
SELECT tablename, rowsecurity AS rls_on
  FROM pg_tables
 WHERE schemaname = 'public'
 ORDER BY rowsecurity, tablename;
