-- Backs the Values & Culture Matching feature: an AI-inferred (or, when no
-- AI provider is configured, lexically-inferred) work-value tag for a
-- candidate, e.g. "sustainability_climate" - see lib/values/value-graph.ts
-- for the catalog and lib/search/engine.ts for how it's blended into the
-- fit score. `value` is plain text rather than a Postgres enum on purpose:
-- the catalog lives in application code, shared with job-side matching,
-- and can grow without a schema migration for every new value added.
--
-- Fully additive (a new table) and every statement is guarded, so this is
-- safe to run any number of times against the live production database.
CREATE TABLE IF NOT EXISTS "candidate_value_signals" (
    "id" TEXT NOT NULL,
    "careerProfileId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" TEXT NOT NULL,
    "source" "DataSource" NOT NULL DEFAULT 'AI_INFERENCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_value_signals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "candidate_value_signals_careerProfileId_idx"
  ON "candidate_value_signals"("careerProfileId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_value_signals_careerProfileId_fkey'
  ) THEN
    ALTER TABLE "candidate_value_signals"
      ADD CONSTRAINT "candidate_value_signals_careerProfileId_fkey"
      FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
