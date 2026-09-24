/**
 * Which pass someone is on, and what that unlocks.
 *
 * Every Pro pass gets the Pro tools. The yearly pass also gets the perks
 * that only make sense over a long stretch of time - they keep working
 * after the job hunt ends, which is the whole case for buying a year:
 *   - always-on job watch (a daily search that only emails exceptional matches)
 *   - the career progress tracker (dream-job readiness re-checked monthly)
 *   - your market value (real salary ranges and rising skills for roles you fit)
 *
 * Beta invite codes unlock the yearly perks too, so testers can try them.
 */

export type ProPlan = "monthly" | "quarterly" | "yearly" | "beta";

export const YEARLY_PERK_PLANS: ReadonlySet<string> = new Set(["yearly", "beta"]);

export function hasYearlyPerks(user: { isPro?: boolean; proPlan?: string | null } | null | undefined): boolean {
  return Boolean(user?.isPro && user.proPlan && YEARLY_PERK_PLANS.has(user.proPlan));
}

/** Plan from a LemonSqueezy variant id, using the same env vars checkout uses. */
export function planForVariant(variantId: string | null | undefined, env: Record<string, string | undefined> = process.env): ProPlan {
  if (variantId && variantId === env.LEMON_SQUEEZY_YEARLY_VARIANT_ID) return "yearly";
  if (variantId && variantId === env.LEMON_SQUEEZY_QUARTERLY_VARIANT_ID) return "quarterly";
  return "monthly";
}

export const YEARLY_PERKS = [
  {
    id: "job-watch",
    name: "Always-on job watch",
    blurb: "After you land a job, Work-ly keeps searching every day and emails you only when something exceptional (Fit 85+) appears.",
  },
  {
    id: "progress",
    name: "Career progress tracker",
    blurb: "Your dream-job readiness re-checked every month, charted over the year, so you can see the climb.",
  },
  {
    id: "market-value",
    name: "Your market value",
    blurb: "Real salary ranges for roles you actually fit, and which skills are rising in demand, from listings Work-ly found.",
  },
] as const;
