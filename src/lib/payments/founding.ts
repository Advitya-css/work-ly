import "server-only";

import { Polar } from "@polar-sh/sdk";

import { foundingFromDiscount, type FoundingOffer, type PolarDiscountLike } from "@/lib/payments/founding-core";

const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; value: FoundingOffer | null } | null = null;

/**
 * The live founding-member offer, read from the Polar discount named in
 * POLAR_FOUNDING_DISCOUNT_ID. Null when none is set, it has ended or run
 * out, or Polar can't be reached - in every doubtful case the site shows
 * full prices rather than a deal checkout might not honour.
 */
export async function getFoundingOffer(): Promise<FoundingOffer | null> {
  const id = process.env.POLAR_FOUNDING_DISCOUNT_ID?.trim();
  if (!id || !process.env.POLAR_ACCESS_TOKEN) return null;
  if (cache && Date.now() - cache.at < CACHE_MS) {
    // Re-check the deadline even inside the cache window.
    return cache.value && cache.value.endsAt && new Date(cache.value.endsAt).getTime() <= Date.now() ? null : cache.value;
  }

  let value: FoundingOffer | null = null;
  try {
    const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN });
    const discount = await polar.discounts.get({ id });
    value = foundingFromDiscount(discount as unknown as PolarDiscountLike);
  } catch (error) {
    console.warn(`[workly:founding] couldn't read the founding discount: ${error instanceof Error ? error.message : String(error)}`);
    value = null;
  }
  cache = { at: Date.now(), value };
  return value;
}
