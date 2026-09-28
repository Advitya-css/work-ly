import "server-only";

import { Polar } from "@polar-sh/sdk";

import { BUSINESS } from "@/lib/business";
import { currentAttribution, recordFunnelStep } from "@/lib/attribution";
import { OFFERS, offerForProduct, offerProductId, type OfferKey } from "@/lib/payments/offers";
import { normalizeOrder } from "@/lib/payments/polar-grant";
import { deliverOfferOrder, type OfferDelivery } from "@/lib/payments/offer-orders";

/**
 * Checkout for the offers (lib/payments/offers.ts), and the look-up the
 * thank-you pages use so a buyer sees what they bought without waiting on
 * the webhook.
 */

function polarClient(): Polar | null {
  return process.env.POLAR_ACCESS_TOKEN ? new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN }) : null;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.work-ly.in").replace(/\/$/, "");
}

export type OfferCheckoutResult = { url: string } | { error: "not_for_sale" | "failed" };

export async function createOfferCheckout(
  key: OfferKey,
  buyer: { id: string; email: string } | null,
): Promise<OfferCheckoutResult> {
  const productId = offerProductId(key);
  const polar = polarClient();
  if (!productId || !polar) return { error: "not_for_sale" };

  const attribution = await currentAttribution();
  const acceptedAt = new Date().toISOString();
  const successPath = key === "sprint" ? "/sprint-intake" : "/seats/thanks";
  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      ...(buyer ? { customerEmail: buyer.email, externalCustomerId: buyer.id } : {}),
      metadata: {
        ...(buyer ? { user_id: buyer.id } : {}),
        offer: key,
        terms_accepted_at: acceptedAt,
        terms_version: BUSINESS.legalUpdated,
        source: attribution?.s ?? "unknown",
        campaign: attribution?.c ?? "",
        landing: attribution?.l ?? "",
        first_touch: attribution?.t ?? "",
      },
      ...(buyer ? { customerMetadata: { user_id: buyer.id } } : {}),
      successUrl: `${siteUrl()}${successPath}?checkout_id={CHECKOUT_ID}`,
    });
    await recordFunnelStep("checkout");
    return { url: checkout.url };
  } catch (error) {
    console.error(`[workly:offers] ${OFFERS[key].name} checkout failed:`, error instanceof Error ? error.message : error);
    return { error: "failed" };
  }
}

export type CheckoutLookup =
  | { status: "delivered"; key: OfferKey; delivery: OfferDelivery; email: string | null }
  | { status: "pending" }
  | { status: "none" }
  | { status: "error" };

/**
 * What a returning buyer paid for, delivered now if it hasn't been.
 * `mustBelongTo` (a signed-in user's id) refuses someone else's checkout.
 */
export async function lookUpOfferCheckout(checkoutId: string, mustBelongTo?: string): Promise<CheckoutLookup> {
  const polar = polarClient();
  if (!polar || !/^[A-Za-z0-9_-]{8,80}$/.test(checkoutId)) return { status: "error" };
  try {
    const page = await polar.orders.list({ checkoutId, limit: 5 });
    for (const raw of page.result.items as unknown[]) {
      const order = normalizeOrder(raw);
      const key = order ? offerForProduct(order.productId) : null;
      if (!order || !key) continue;
      if (mustBelongTo && !order.userIds.includes(mustBelongTo)) continue;
      if (!order.paid) return { status: "pending" };
      const delivery = await deliverOfferOrder(order, key);
      return { status: "delivered", key, delivery, email: order.customerEmail };
    }
    const checkout = await polar.checkouts.get({ id: checkoutId });
    if (checkout.status === "confirmed" || checkout.status === "succeeded") return { status: "pending" };
    return { status: "none" };
  } catch (error) {
    console.error("[workly:offers] checkout look-up failed:", error instanceof Error ? error.message : error);
    return { status: "error" };
  }
}
