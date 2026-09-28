import type { PolarDiscountLike } from "@/lib/payments/founding-core";

/**
 * A TIME-BOXED SALE ON ONE PLAN (the Black Friday Yearly Pass) - pure parts.
 *
 * Like the founding offer, the sale is a Polar discount and Work-ly only
 * reads it: its start and end dates, and the amount off, come from Polar,
 * so the site shows the sale exactly while checkout honours it and the
 * banner disappears on its own when it ends. No countdown that resets, no
 * "was" price that never existed.
 *
 * Set in the environment:
 *   POLAR_SALE_DISCOUNT_ID  the discount (percentage or fixed amount, with start and end dates)
 *   SALE_PLAN               which plan it's for: yearly (default), quarterly or monthly
 *   SALE_NAME               what to call it, e.g. "Black Friday" (default "Sale")
 */

export type SalePlan = "monthly" | "quarterly" | "yearly";

export interface Sale {
  discountId: string;
  name: string;
  plan: SalePlan;
  percentOff: number | null;
  amountOffCents: number | null;
  /** ISO strings, so the sale can cross to client components. */
  startsAt: string | null;
  endsAt: string;
}

export type PublicSale = Omit<Sale, "discountId">;

export interface PolarSaleDiscountLike extends PolarDiscountLike {
  amount?: number;
  amounts?: Record<string, number>;
}

export function salePlan(value: string | undefined): SalePlan {
  return value === "monthly" || value === "quarterly" ? value : "yearly";
}

/**
 * A live sale, or null. A sale with no end date is refused on purpose: a
 * "limited-time" price that never ends is a false claim.
 */
export function saleFromDiscount(
  d: PolarSaleDiscountLike | null | undefined,
  opts: { name?: string; plan?: string },
  now = new Date(),
): Sale | null {
  if (!d || !d.id) return null;
  const endsAt = d.endsAt ? new Date(d.endsAt) : null;
  if (!endsAt || endsAt.getTime() <= now.getTime()) return null;
  const startsAt = d.startsAt ? new Date(d.startsAt) : null;
  if (startsAt && startsAt.getTime() > now.getTime()) return null;
  if (d.maxRedemptions != null && (d.redemptionsCount ?? 0) >= d.maxRedemptions) return null;

  const percentOff = typeof d.basisPoints === "number" && d.basisPoints > 0 ? d.basisPoints / 100 : null;
  const fixed = d.amounts?.usd ?? d.amount;
  const amountOffCents = percentOff == null && typeof fixed === "number" && fixed > 0 ? Math.round(fixed) : null;
  if (percentOff == null && amountOffCents == null) return null;

  return {
    discountId: d.id,
    name: (opts.name ?? "").trim().slice(0, 30) || "Sale",
    plan: salePlan(opts.plan),
    percentOff,
    amountOffCents,
    startsAt: startsAt ? startsAt.toISOString() : null,
    endsAt: endsAt.toISOString(),
  };
}

/** The sale price of a plan, in cents, never below zero; rounded down. */
export function salePriceCents(priceUsd: number, sale: Pick<Sale, "percentOff" | "amountOffCents">): number {
  const cents = Math.round(priceUsd * 100);
  if (sale.percentOff != null) return Math.max(0, Math.floor(cents * (1 - sale.percentOff / 100)));
  return Math.max(0, cents - (sale.amountOffCents ?? 0));
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** "Mon 30 Nov" in UTC - the day the sale's last hour falls on. */
export function saleEndDay(endsAtIso: string): string {
  const last = new Date(new Date(endsAtIso).getTime() - 1);
  return last.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** "Black Friday: the Yearly Pass is $99.00 (was $149.99) until Mon 30 Nov" */
export function saleLine(sale: PublicSale, plan: { name: string; priceUsd: number; price: string }): string {
  return `${sale.name}: the ${plan.name} is ${formatCents(salePriceCents(plan.priceUsd, sale))} (usually ${plan.price}) until ${saleEndDay(sale.endsAt)}`;
}
