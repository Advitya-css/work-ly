-- Additive, idempotent: adds a small DB-backed table listing which
-- countries Workly has sourced student work-hour rules for. The detailed,
-- sourced legal text (headline/detail/confirmWith/sourceUrl) stays in
-- src/lib/student/legal-limits.ts on purpose - that content requires a
-- human to read and cite an official government source before it changes,
-- which is a code-review property, not a data-entry one. What moves to
-- the DB is the "which countries are currently supported" list, so every
-- country picker in the app (onboarding, student settings) reads from one
-- place and adding a country doesn't require hunting down every hardcoded
-- reference to COUNTRY_RULES.
--
-- Every statement is guarded, so this is safe to run any number of times
-- against the live production database.
CREATE TABLE IF NOT EXISTS "student_country_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unverified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_country_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_country_rules_code_key" ON "student_country_rules"("code");

-- Idempotent seed, mirrors legal-limits.ts's COUNTRY_RULES at the time of
-- writing. Fixed literal ids (rather than a DB-generated uuid) so this
-- doesn't depend on any particular Postgres extension being enabled.
-- ON CONFLICT means re-applying this migration is a no-op.
INSERT INTO "student_country_rules" ("id", "code", "label", "unverified")
VALUES
    ('4d1f7b8e-3a2c-4b8d-9e1a-000000000001', 'US', 'United States', false),
    ('4d1f7b8e-3a2c-4b8d-9e1a-000000000002', 'GB', 'United Kingdom', true),
    ('4d1f7b8e-3a2c-4b8d-9e1a-000000000003', 'CA', 'Canada', false),
    ('4d1f7b8e-3a2c-4b8d-9e1a-000000000004', 'AU', 'Australia', false)
ON CONFLICT ("code") DO NOTHING;
