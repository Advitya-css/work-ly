import "server-only";

import { Polar } from "@polar-sh/sdk";

import { saleFromDiscount, type PolarSaleDiscountLike, type Sale } from "@/lib/payments/sale-core";

const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; value: Sale | null } | null = null;

/**
 * The live sale (sale-core.ts), read from the Polar discount in
 * POLAR_SALE_DISCOUNT_ID. Null when none is set, it hasn't started, it has
 * ended, or Polar can't be reached - in every doubtful case, full prices.
 */
export async function getSale(): Promise<Sale | null> {
  const id = process.env.POLAR_SALE_DISCOUNT_ID?.trim();
  if (!id || !process.env.POLAR_ACCESS_TOKEN) return null;
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    const v = cache.value;
    return v && new Date(v.endsAt).getTime() > now ? v : null;
  }
  let value: Sale | null = null;
  try {
    const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN });
    const discount = await polar.discounts.get({ id });
    value = saleFromDiscount(discount as unknown as PolarSaleDiscountLike, {
      name: process.env.SALE_NAME,
      plan: process.env.SALE_PLAN,
    });
  } catch (error) {
    console.warn(`[workly:sale] couldn't read the sale discount: ${error instanceof Error ? error.message : String(error)}`);
    value = null;
  }
  cache = { at: now, value };
  return value;
}
