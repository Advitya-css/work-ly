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

/**
 * Country coverage, display currency (from "Where you are now" or IP), and
 * regional PPP discount (without Polar ids) for the current visitor.
 */
export async function getPppContextAction(): Promise<import("@/lib/payments/ppp-core").PublicPppContext> {
  const { getPppContext } = await import("@/lib/payments/ppp");
  const { getCurrentUser } = await import("@/lib/auth");
  const { getCareerProfileByUserId } = await import("@/lib/db/career-profile");
  const { countryCodeForPlace } = await import("@/lib/places");

  const user = await getCurrentUser().catch(() => null);
  const profile = user ? await getCareerProfileByUserId(user.id).catch(() => null) : null;
  const ctx = await getPppContext({ profileLocationFallback: profile?.location ?? null });
  const displayCountryCode = countryCodeForPlace(profile?.location) ?? ctx.countryCode;

  if (!ctx.offer) {
    return {
      covered: ctx.covered,
      countryCode: ctx.countryCode,
      countryName: ctx.countryName,
      displayCountryCode,
      offer: null,
    };
  }
  const { discountId: _omit, ...publicOffer } = ctx.offer;
  return {
    covered: ctx.covered,
    countryCode: ctx.countryCode,
    countryName: ctx.countryName,
    displayCountryCode,
    offer: publicOffer,
  };
}
