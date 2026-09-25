import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { PLAN_INTENT_COOKIE, isPaidInterval } from "@/lib/payments/plan-intent";

/**
 * "Get Yearly Pass" from the public Pricing page lands here.
 *
 * Signed in: straight to the checkout step in Settings with that plan
 * picked. Signed out: the choice is remembered in a short-lived cookie and
 * they're sent to sign up; the dashboard sends them back here once they're
 * in (after onboarding or login), so the plan they chose is never lost.
 */
export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get("plan");
  const interval = isPaidInterval(plan) ? plan : null;
  const user = await getCurrentUser().catch(() => null);

  if (!user) {
    const res = NextResponse.redirect(new URL("/signup", request.url));
    if (interval) {
      res.cookies.set(PLAN_INTENT_COOKIE, interval, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 2,
      });
    }
    return res;
  }

  const target = new URL(interval ? `/settings?plan=${interval}` : "/settings", request.url);
  target.hash = "plan";
  const res = NextResponse.redirect(target);
  res.cookies.delete(PLAN_INTENT_COOKIE);
  return res;
}
