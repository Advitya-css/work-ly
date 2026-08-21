// Deliberately dependency-free (no `server-only`, no `next/headers`) so it
// can be imported from both server code (session.ts) and the Edge runtime
// (middleware.ts) without pulling in anything unsupported there.
export const SESSION_COOKIE_NAME = "workly_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
