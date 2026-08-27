-- schema.prisma already declares User.isPro and User.lastAlertSentAt (added
-- alongside the daily-discovery-limit / upgrade-prompt work), and
-- /api/cron/job-alerts already queries and updates both columns - but no
-- migration ever created them. Against a real database this throws
-- "column ... does not exist" on every cron run, silently breaking the
-- weekly job-alert email for every Pro user. Additive and nullable/defaulted
-- so it is safe to run against the live production database at any time.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "isPro" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastAlertSentAt" TIMESTAMP(3);
