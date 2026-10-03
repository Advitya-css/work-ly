// Deliberately dependency-free (no `server-only`, no `next/headers`) so it
// can be imported from both server code (session.ts) and the Edge runtime
// (proxy.ts) without pulling in anything unsupported there.
export const SESSION_COOKIE_NAME = "workly_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours
export const REMEMBER_ME_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
/**
 * Readable by the page's own JavaScript and holds only "1": lets cached
 * public pages show "Dashboard" to someone signed in. Never trusted for
 * access - proxy.ts sets and clears it to follow the real session cookie.
 */
export const SIGNED_IN_HINT_COOKIE = "wl_signed_in";
