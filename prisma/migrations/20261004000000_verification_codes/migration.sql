-- Switches email verification from a 24h link/token to a short-lived
-- 6-digit code, entered by the user rather than clicked. Additive only:
-- the old verificationToken / verificationTokenExpiresAt columns are left
-- in place (unused going forward) rather than dropped, so this is safe to
-- run against the live production database without touching existing rows.
--
-- verificationCodeHash stores a bcrypt hash of the code, never the code
-- itself - same reasoning as passwordHash: a database leak shouldn't hand
-- out working codes.
-- verificationAttempts caps how many wrong guesses a single issued code
-- accepts before the user has to request a new one - a 6-digit code is
-- only 1,000,000 possibilities, so expiry (10 minutes, set by the app)
-- alone isn't enough; this bounds a brute-force attempt against one
-- account's current code regardless of where the guesses come from.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "verificationCodeHash" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationCodeExpiresAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "verificationAttempts" INTEGER NOT NULL DEFAULT 0;
