/**
 * FOLLOW-UP EMAILS - which one (if any) a person is due. Pure, so tested.
 *
 * Most buyers need a second nudge. A daily job asks this for each recent
 * account and sends at most ONE email per person per day:
 *
 *   checkout  - opened checkout 1 hour to 7 days ago and hasn't paid
 *   welcome   - day 0-1: their first report and the obvious next step
 *   gap       - day 2-3: the one gap worth closing this week
 *   founding  - day 5-7: the offer and its deadline
 *
 * Nobody paying, nobody who unsubscribed, and each kind only once.
 */

export type LifecycleKind = "checkout" | "welcome" | "gap" | "founding";

export const LIFECYCLE_KINDS: LifecycleKind[] = ["checkout", "welcome", "gap", "founding"];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface LifecycleInput {
  createdAt: Date;
  now: Date;
  /** Paying (or code/seat) Pro - never nudged to buy. Trial users are NOT paying. */
  isPayingPro: boolean;
  optedOut: boolean;
  sent: Set<LifecycleKind>;
  /** When they last opened checkout without paying, if in the last 7 days. */
  checkoutOpenedAt: Date | null;
}

export function dueLifecycleEmail(input: LifecycleInput): LifecycleKind | null {
  if (input.optedOut || input.isPayingPro) return null;
  const now = input.now.getTime();

  if (input.checkoutOpenedAt && !input.sent.has("checkout")) {
    const since = now - input.checkoutOpenedAt.getTime();
    if (since >= HOUR && since <= 7 * DAY) return "checkout";
  }

  const age = (now - input.createdAt.getTime()) / DAY;
  if (age < 0) return null;
  if (age < 2 && !input.sent.has("welcome")) return "welcome";
  if (age >= 2 && age < 4 && !input.sent.has("gap")) return "gap";
  if (age >= 5 && age < 8 && !input.sent.has("founding")) return "founding";
  return null;
}

/** Paid plans stored on a checkout marker's count (0 = unknown). */
export const CHECKOUT_PLAN_CODES = ["", "monthly", "quarterly", "yearly"] as const;

export function checkoutPlanCode(plan: string): number {
  const i = CHECKOUT_PLAN_CODES.indexOf(plan as (typeof CHECKOUT_PLAN_CODES)[number]);
  return i > 0 ? i : 0;
}
