-- Re-applies Row-Level Security to EVERY table in the public schema.
--
-- The first RLS migration (20260923000000_enable_rls) sorts before the
-- migrations dated 2026-09-24 and 2026-10-xx, so tables created by those -
-- including "feedbacks" - were never covered and stayed readable through
-- Supabase's public REST API with the anon key. This one is dated after
-- every existing migration and is safe to run any number of times.
--
-- The app itself connects as the table owner through DATABASE_URL, and
-- owners bypass RLS (we deliberately do NOT use FORCE ROW LEVEL SECURITY),
-- so no application query is affected. With no policies defined, the anon
-- and authenticated REST roles simply see nothing.
--
-- ANY TABLE ADDED LATER needs its own ENABLE ROW LEVEL SECURITY line in the
-- migration that creates it.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END
$$;
