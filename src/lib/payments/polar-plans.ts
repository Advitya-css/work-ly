import type { ProPlan } from "@/lib/plans";

/**
 * Polar product ids for each plan - shared by checkout (lib/payments/polar.ts)
 * and the webhook, so the two can't drift apart.
 */
export const POLAR_PRODUCT_IDS: Record<"monthly" | "quarterly" | "yearly", string> = {
  monthly: "e1ee10eb-0538-4363-99aa-a2d8141ec127",
  quarterly: "7e7f1dbc-9f22-44f9-bd6b-196911383dbe",
  yearly: "a42ffed2-dd57-4e6c-af7c-ba112e9ec43f",
};

/** How much Pro time each plan buys, as a Postgres interval. */
export const PLAN_INTERVAL: Record<"monthly" | "quarterly" | "yearly", string> = {
  monthly: "1 month",
  quarterly: "3 months",
  yearly: "1 year",
};

export type PolarPlan = Exclude<ProPlan, "beta">;

export function planForProduct(productId: string | null | undefined): PolarPlan | null {
  for (const [plan, id] of Object.entries(POLAR_PRODUCT_IDS)) {
    if (id === productId) return plan as PolarPlan;
  }
  return null;
}
