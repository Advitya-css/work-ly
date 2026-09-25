/** Remembers which paid plan someone picked on the Pricing page while they sign up. */
export const PLAN_INTENT_COOKIE = "workly_plan_intent";

export type PaidInterval = "monthly" | "quarterly" | "yearly";

export function isPaidInterval(value: unknown): value is PaidInterval {
  return value === "monthly" || value === "quarterly" || value === "yearly";
}
