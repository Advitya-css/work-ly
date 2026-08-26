-- Discovered jobs cache a fitScore the same way opportunities/dream-jobs do,
-- but never stored WHY a score was or wasn't reliable - so an
-- insufficient-data case (fitScore collapsed to 0 by the scoring engine
-- when there wasn't enough profile/posting data to measure) was
-- indistinguishable from a genuinely poor match, and the discovery feed
-- could show a bare "Fit 0/100" badge that looked like a real measurement.
--
-- fitCoverage mirrors the 0-1 coverage ratio already computed by the Fit
-- engine (see lib/scoring/coverage.ts) so the UI can withhold the badge
-- exactly the way it already does on the Opportunities and Dream Job
-- detail pages. Nullable and additive: existing rows simply have no
-- coverage recorded until the next discovery run refreshes them, at which
-- point the UI's fallback (`fitCoverage == null` treated as "unknown, but
-- show the score" for scores set before this change) keeps old data
-- displaying as it did before.
ALTER TABLE "discovered_jobs"
  ADD COLUMN IF NOT EXISTS "fitCoverage" DOUBLE PRECISION;
