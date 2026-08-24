-- Rate limiting backing store. lib/rate-limit.ts implements a sliding
-- per-key counter with a single atomic INSERT ... ON CONFLICT, so two
-- concurrent requests from the same key can't both read "0 so far" and
-- both be let through. A plain table rather than an in-memory counter
-- deliberately: this app can run as more than one server process, and a
-- limit only one process knows about is not a limit.
--
-- Schema matches lib/rate-limit.ts's actual query shape: "key" identifies
-- the caller and action being limited (e.g. "auth_<ip>", "upload_<userId>"),
-- "count" is the running count within the current window, and
-- "expires_at" is when that window resets - checkRateLimit resets count to
-- 1 once expires_at has passed rather than rejecting.
CREATE TABLE IF NOT EXISTS "rate_limits" (
  "key"        TEXT PRIMARY KEY,
  "count"      INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "rate_limits_expires_at_idx" ON "rate_limits" ("expires_at");
