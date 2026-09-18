-- The onboarding "Try with a sample profile" button (loadSampleProfileAction)
-- writes a fabricated Senior Product Manager profile straight into the same
-- headline/location/currentRole/yearsExperience/skills fields the schema
-- comment above documents as "Facts the user directly provided (never
-- AI-invented)". Nothing marked that data as a sample, so a user who never
-- uploaded a real resume ended up with permanently fabricated qualifications
-- indistinguishable from real ones - including anywhere that data is later
-- shown to someone else, like the public profile share page.
--
-- isSampleData is set true by loadSampleProfileAction and cleared back to
-- false the moment real facts are saved (see upsertCareerProfile, the single
-- overwrite path used by both resume parsing and the manual profile form),
-- so the flag always reflects whether the current data is real. Additive and
-- defaulted false - existing rows are unaffected.
ALTER TABLE "career_profiles"
  ADD COLUMN IF NOT EXISTS "isSampleData" BOOLEAN NOT NULL DEFAULT false;
