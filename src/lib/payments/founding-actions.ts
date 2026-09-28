"use server";

import { getFoundingOffer } from "@/lib/payments/founding";
import type { PublicFoundingOffer } from "@/lib/payments/founding-core";

/**
 * For client components (the upgrade dialog, the free grader). Public by
 * design - the same offer the pricing page shows to anyone - and returns
 * no user data and not the Polar discount id.
 */
export async function getFoundingOfferAction(): Promise<PublicFoundingOffer | null> {
  const offer = await getFoundingOffer();
  if (!offer) return null;
  const { discountId: _omit, ...publicOffer } = offer;
  return publicOffer;
}

/**
 * The live sale (the Black Friday Yearly Pass), for client components.
 * Public by design - the same sale the pricing page shows - and returns
 * no user data and not the Polar discount id.
 */
export async function getSaleAction(): Promise<import("@/lib/payments/sale-core").PublicSale | null> {
  const { getSale } = await import("@/lib/payments/sale");
  const sale = await getSale();
  if (!sale) return null;
  const { discountId: _omit, ...publicSale } = sale;
  return publicSale;
}
