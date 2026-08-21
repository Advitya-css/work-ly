import { NextResponse, type NextRequest } from "next/server";

import { clearSessionCookie } from "@/lib/auth/session";

/**
 * Clears a stale session cookie and sends the user to /login.
 *
 * WHY THIS ROUTE EXISTS
 *
 * proxy.ts decides whether you're signed in by verifying the JWT alone - it
 * runs on the Edge runtime and cannot query Postgres. That's normally fine,
 * but it means a cryptographically valid token for a user row that no
 * longer exists is treated as "signed in".
 *
 * That produced an infinite redirect loop:
 *
 *   proxy: token is valid          -> allow /dashboard
 *   (app)/layout: no such user     -> redirect /login
 *   proxy: token is valid, /login
 *          is auth-only            -> redirect /dashboard
 *   ...forever, until the browser gives up with ERR_TOO_MANY_REDIRECTS
 *   and shows a blank white page.
 *
 * The loop is unbreakable from either side alone: the layout can't delete a
 * cookie (Server Components may not mutate cookies during render) and the
 * middleware can't check the database. A Route Handler can do both things
 * the other two can't - so the layout redirects here, this deletes the
 * cookie, and the next request has no token at all.
 *
 * Reached whenever a session outlives its user: after `npm run db:rebuild`,
 * after deleting an account, or after pointing DATABASE_URL at a different
 * database.
 */
export async function GET(request: NextRequest) {
  await clearSessionCookie();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("reason", "session-expired");
  return NextResponse.redirect(loginUrl);
}
