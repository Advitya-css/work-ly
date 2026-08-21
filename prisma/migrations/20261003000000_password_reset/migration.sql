ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT,
  ADD COLUMN IF NOT EXISTS "resetPasswordTokenExpiresAt" TIMESTAMPTZ;
