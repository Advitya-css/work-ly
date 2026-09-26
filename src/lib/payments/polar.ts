"use server";

import { Polar } from "@polar-sh/sdk";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { POLAR_PRODUCT_IDS } from "@/lib/payments/polar-plans";
import { BUSINESS } from "@/lib/business";
import { syncPolarPurchases } from "@/lib/payments/polar-sync";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  // We can pass organizationId if needed, but not strictly required if using default org for the token
});

const PRODUCT_IDS = POLAR_PRODUCT_IDS;

export async function createPolarCheckout(
  plan: "monthly" | "quarterly" | "yearly",
  consent: { acceptedTerms?: boolean } = {},
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Must be logged in to checkout");
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

    const result = await polar.checkouts.create({
      products: [productId],
      customerEmail: user.email,
      // Ties the Polar customer to this account, so renewals and refunds
      // map back to the right user even without checkout metadata.
      externalCustomerId: user.id,
      // Kept on the order in Polar: proof of what the buyer agreed to, and
      // when, if a refund or chargeback is ever disputed.
      metadata: {
        user_id: user.id,
        terms_accepted_at: acceptedAt,
        terms_version: BUSINESS.legalUpdated,
        refund_rule: `${BUSINESS.refundDays} days, under ${BUSINESS.refundUsageLimit} Pro AI tools`,
      },
      customerMetadata: { user_id: user.id },
      customFieldData: { user_id: user.id },
      // Polar fills in {CHECKOUT_ID}. Settings uses it to confirm the payment
      // with Polar directly, so Pro shows up at once instead of waiting on
      // the webhook.
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.work-ly.in"}/settings?checkout_id={CHECKOUT_ID}`,
    });

    return { url: result.url };
  } catch (error: any) {
    console.error("Polar checkout error:", error);
    return { error: error.message || "Failed to create checkout" };
  }
}

/** "Restore purchase": re-checks Polar for this account's paid orders and applies them. */
export async function restorePurchaseAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const result = await syncPolarPurchases(user);
  redirect(`/settings?payment=${result.status}${result.status === "granted" ? `&plan=${result.plan}` : ""}#plan`);
}
