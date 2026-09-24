-- Yearly-pass perks.
--
-- "proPlan" records which pass paid for Pro ('monthly', 'quarterly',
-- 'yearly', 'beta'), so features can be reserved for the yearly pass.
-- NULL for anyone who upgraded before this column existed.
--
-- "watchEnabled" / "watchMinFit" / "lastWatchAt" (last checked) drive the always-on
-- job watch: a daily background search that emails only exceptional
-- matches (Candidate Fit at or above watchMinFit).
--
-- readiness_snapshots keeps every dream-job readiness score over time, so
-- the progress tracker can show the climb.
--
-- Safe to run more than once. The app tolerates these not existing yet
-- (it reads them defensively), so deploying before migrating breaks nothing.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "proPlan" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "watchEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "watchMinFit" INTEGER NOT NULL DEFAULT 85;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastWatchAt" TIMESTAMP(3);

-- Public checkout isn't live yet, so everyone who is Pro today got it from a
-- beta code or a referral: mark them 'beta' so testers get the yearly perks.
-- Only touches rows with no plan recorded, so it's a no-op on re-runs.
UPDATE "users" SET "proPlan" = 'beta' WHERE "isPro" = true AND "proPlan" IS NULL;

CREATE TABLE IF NOT EXISTS "readiness_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dreamJobId" TEXT NOT NULL,
    "readinessScore" INTEGER NOT NULL,
    "coverage" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "stepsCompleted" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "readiness_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "readiness_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "readiness_snapshots_dreamJobId_fkey" FOREIGN KEY ("dreamJobId") REFERENCES "dream_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "readiness_snapshots_userId_dreamJobId_createdAt_idx"
    ON "readiness_snapshots"("userId", "dreamJobId", "createdAt");

-- Every new table needs this (see 20261101000000_enable_rls_everywhere).
ALTER TABLE "readiness_snapshots" ENABLE ROW LEVEL SECURITY;
