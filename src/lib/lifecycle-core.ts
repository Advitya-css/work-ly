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
 *   trial_ended - within 4 days of the one-day Pro trial ending: what they
 *               built is saved, and the founding price (replaces "founding")
 *
 * Nobody paying, nobody who unsubscribed, and each kind only once.
 */

export type LifecycleKind = "checkout" | "trial_ended" | "welcome" | "gap" | "founding";

export const LIFECYCLE_KINDS: LifecycleKind[] = ["checkout", "trial_ended", "welcome", "gap", "founding"];

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
  /** When their one-day Pro trial ended, if it has. */
  trialEndedAt?: Date | null;
}

export function dueLifecycleEmail(input: LifecycleInput): LifecycleKind | null {
  if (input.optedOut || input.isPayingPro) return null;
  const now = input.now.getTime();

  if (input.checkoutOpenedAt && !input.sent.has("checkout")) {
    const since = now - input.checkoutOpenedAt.getTime();
    if (since >= HOUR && since <= 7 * DAY) return "checkout";
  }

  // The trial just ended: the moment they decide, so it goes before the
  // day-count emails. It carries the offer, so "founding" isn't sent after it.
  if (input.trialEndedAt && !input.sent.has("trial_ended")) {
    const since = now - input.trialEndedAt.getTime();
    if (since >= 0 && since <= 4 * DAY) return "trial_ended";
  }

  const age = (now - input.createdAt.getTime()) / DAY;
  if (age < 0) return null;
  if (age < 2 && !input.sent.has("welcome")) return "welcome";
  if (age >= 2 && age < 4 && !input.sent.has("gap")) return "gap";
  if (age >= 5 && age < 8 && !input.sent.has("founding") && !input.sent.has("trial_ended")) return "founding";
  return null;
}

/** Paid plans stored on a checkout marker's count (0 = unknown). */
export const CHECKOUT_PLAN_CODES = ["", "monthly", "quarterly", "yearly"] as const;

export function checkoutPlanCode(plan: string): number {
  const i = CHECKOUT_PLAN_CODES.indexOf(plan as (typeof CHECKOUT_PLAN_CODES)[number]);
  return i > 0 ? i : 0;
}
