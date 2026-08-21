-- Student mode, and account-level location preferences.
--
-- Two things move to the career profile, which is the one row that already
-- exists per user:
--
-- 1. Student details. Being a student changes what the whole product should
--    show you, so it is a property of the person, not of one career goal.
--    `studentCountry` exists because work-hour rules are national: without
--    knowing the country there is no honest way to show a limit.
--
-- 2. Location preferences. These were previously only on a career goal,
--    which meant someone with no goal set had nowhere to say where they
--    live or where they would work. They belong to the account.
--
-- Every column uses IF NOT EXISTS so this file is safe to re-run.
-- Without it, a database left half-migrated (an interrupted run, a manually
-- altered table) can never recover: the migration fails on the first column
-- that already exists, and the remaining ones are never added, so the only
-- way out is dropping the whole database.

ALTER TABLE "career_profiles"
  ADD COLUMN IF NOT EXISTS "isStudent"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "university"          TEXT,
  ADD COLUMN IF NOT EXISTS "major"               TEXT,
  ADD COLUMN IF NOT EXISTS "expectedGraduation"  TEXT,
  ADD COLUMN IF NOT EXISTS "studentCountry"      TEXT,
  ADD COLUMN IF NOT EXISTS "preferredLocations"  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "openToRemote"        BOOLEAN NOT NULL DEFAULT true;
