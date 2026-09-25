import "server-only";

import { checkRateLimit } from "@/lib/rate-limit";

/**
 * THE FREE AI ALLOWANCE - so one busy day can't drain the AI key.
 *
 * Every AI action a free account takes (analyze a job, a discovery run's
 * AI read, "read in full", the free checker, a follow-up or counter-offer
 * email, the free dream job) spends one unit of a daily allowance. There is
 * also a shared daily total across ALL free accounts, so a traffic spike
 * from a launch post can only ever use a set share of the key - Pro
 * members, who have their own hourly budget, are always served.
 *
 * Both numbers can be changed in the environment without a code change.
 * The windows are rolling 24 hours from the first use.
 */

export const FREE_AI_DAILY_PER_USER = Number(process.env.FREE_AI_DAILY_PER_USER ?? 15);
export const FREE_AI_DAILY_TOTAL = Number(process.env.FREE_AI_DAILY_TOTAL ?? 1500);
const DAY_SECONDS = 24 * 60 * 60;

export const FREE_AI_LIMIT_MESSAGE =
  "You've used today's free AI checks. They refill within 24 hours - or upgrade to Pro for unlimited analyses.";

/** Spends one unit for a free account; always true for Pro. */
export async function spendFreeAi(user: { id: string; isPro?: boolean }): Promise<boolean> {
  if (user.isPro) return true;
  if (!(await checkRateLimit(`free_ai_day_${user.id}`, FREE_AI_DAILY_PER_USER, DAY_SECONDS))) return false;
  return checkRateLimit("free_ai_day_total", FREE_AI_DAILY_TOTAL, DAY_SECONDS);
}

/** For visitors without an account (the free checker): counts against the shared free total only. */
export async function spendAnonymousAi(): Promise<boolean> {
  return checkRateLimit("free_ai_day_total", FREE_AI_DAILY_TOTAL, DAY_SECONDS);
}
