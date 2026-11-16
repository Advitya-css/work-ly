"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { POLAR_PRODUCT_IDS } from "@/lib/payments/polar-plans";
import { BUSINESS } from "@/lib/business";
import { syncPolarPurchases } from "@/lib/payments/polar-sync";
import { getFoundingOffer } from "@/lib/payments/founding";
import { getSale } from "@/lib/payments/sale";
import { currentAttribution, recordFunnelStep } from "@/lib/attribution";
import { markCheckoutOpened } from "@/lib/lifecycle";
import { openPolarCheckout } from "@/lib/payments/checkout";

const PRODUCT_IDS = POLAR_PRODUCT_IDS;

export async function createPolarCheckout(
  plan: "monthly" | "quarterly" | "yearly",
  consent: { acceptedTerms?: boolean } = {},
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Please sign in again, then pick your plan." };
    }

    // The upgrade dialog makes buyers tick the Terms / Refund policy box
    // before checkout; refuse a checkout that skipped it.
    if (!consent.acceptedTerms) {
      return { error: "Please agree to the Terms of Service and Refund policy first." };
    }
    const acceptedAt = new Date().toISOString();

    const productId = PRODUCT_IDS[plan];
    if (!productId) {
      throw new Error("Invalid plan selected");
    }

    // A sale on this plan (Black Friday) wins; otherwise the founding-member
    // discount, while Polar says it's still open. Never both: Polar applies
    // one discount per checkout, and the site never advertises them stacked.
    const sale = await getSale();
    const founding = sale && sale.plan === plan ? null : await getFoundingOffer();
    const discountId = sale && sale.plan === plan ? sale.discountId : founding?.discountId ?? null;
    // The channel that first brought this buyer, carried onto the order so
    // revenue can be credited to it (see lib/attribution.ts).
    const attribution = await currentAttribution();
    const outcome = await openPolarCheckout({
      productId,
      email: user.email,
      userId: user.id,
      // Kept on the order in Polar: proof of what the buyer agreed to, and
      // when, if a refund or chargeback is ever disputed. user_id here is
      // what credits the purchase, whatever else Polar refuses.
      metadata: {
        user_id: user.id,
        terms_accepted_at: acceptedAt,
        terms_version: BUSINESS.legalUpdated,
        refund_rule: `${BUSINESS.refundDays} days, under ${BUSINESS.refundUsageLimit} Pro AI tools`,
        source: attribution?.s ?? "unknown",
        campaign: attribution?.c ?? "",
        landing: attribution?.l ?? "",
        first_touch: attribution?.t ?? "",
      },
      // Polar fills in {CHECKOUT_ID}. Settings uses it to confirm the payment
      // with Polar directly, so Pro shows up at once instead of waiting on
      // the webhook.
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.work-ly.in"}/settings?checkout_id={CHECKOUT_ID}`,
      discountId,
    });
    if (!outcome.ok) {
      console.error(`[workly:checkout] ${plan} for ${user.id}: ${outcome.advice.adminReason}`);
      return { error: outcome.advice.userMessage };
    }
    // Bookkeeping never blocks a buyer who already has a checkout link.
    await recordFunnelStep("checkout").catch((e) => console.warn("[workly:checkout] funnel step:", e));
    // For the "your upgrade is still open" email if they don't finish.
    await markCheckoutOpened(user.id, plan).catch((e) => console.warn("[workly:checkout] checkout marker:", e));
    return { url: outcome.url };
  } catch (error) {
    console.error("Polar checkout error:", error);
    return { error: "Checkout didn't open. Please try again in a minute, or email advitya@work-ly.in and I'll sort it out for you." };
  }
}

/** "Restore purchase": re-checks Polar for this account's paid orders and applies them. */
export async function restorePurchaseAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const result = await syncPolarPurchases(user);
  redirect(`/settings?payment=${result.status}${result.status === "granted" ? `&plan=${result.plan}` : ""}#plan`);
}
