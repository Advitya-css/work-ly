import "server-only";

import { Polar } from "@polar-sh/sdk";

import { checkoutAdvice, readCheckoutError, type CheckoutAdvice, type CheckoutRetry } from "@/lib/payments/checkout-errors";

/**
 * Opens a Polar checkout, trying again without the optional extras Polar
 * sometimes refuses. Each step drops one thing and keeps the essentials:
 * the product, the success link, and the Work-ly account id in the order's
 * metadata (which is what credits the purchase - see polar-grant.ts).
 *
 *   1. everything, with the discount
 *   2. without the discount (the last founding spot went a second ago)
 *   3. without tying it to a Polar customer (a customer already exists
 *      under a different email or id)
 *   4. without pre-filling the email (Polar refused the address)
 *
 * An expired token, an account that can't take payments or a missing
 * product won't be fixed by trying again, so those stop at once.
 */

export interface CheckoutRequest {
  productId: string;
  email: string;
  userId: string;
  metadata: Record<string, string>;
  successUrl: string;
  discountId: string | null;
}

export type CheckoutOutcome =
  | { ok: true; url: string; dropped: CheckoutRetry[] }
  | { ok: false; advice: CheckoutAdvice; dropped: CheckoutRetry[] };

function body(req: CheckoutRequest, dropped: Set<CheckoutRetry>) {
  return {
    products: [req.productId],
    metadata: req.metadata,
    successUrl: req.successUrl,
    ...(dropped.has("drop-email") ? {} : { customerEmail: req.email }),
    ...(dropped.has("drop-customer-link")
      ? {}
      : {
          // Ties the Polar customer to this account, so renewals and refunds
          // map back to the right user even without checkout metadata.
          externalCustomerId: req.userId,
          customerMetadata: { user_id: req.userId },
          customFieldData: { user_id: req.userId },
        }),
    ...(req.discountId && !dropped.has("drop-discount") ? { discountId: req.discountId } : {}),
  };
}

export async function openPolarCheckout(req: CheckoutRequest, polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN })): Promise<CheckoutOutcome> {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    return {
      ok: false,
      dropped: [],
      advice: {
        userMessage: "Payments are paused on our side for a moment. Please try again later today, or email advitya@work-ly.in and I'll sort it out for you.",
        adminReason: "POLAR_ACCESS_TOKEN isn't set on this deployment. Add it in Vercel and redeploy.",
        retry: null,
      },
    };
  }
  const dropped = new Set<CheckoutRetry>();
  const tried: CheckoutRetry[] = [];
  if (!req.discountId) dropped.add("drop-discount");
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const result = await polar.checkouts.create(body(req, dropped) as Parameters<typeof polar.checkouts.create>[0]);
      if (tried.length) console.warn(`[workly:checkout] opened after dropping: ${tried.join(", ")}`);
      return { ok: true, url: result.url, dropped: tried };
    } catch (error) {
      const failure = readCheckoutError(error);
      const advice = checkoutAdvice(failure);
      console.error(`[workly:checkout] attempt ${attempt + 1} failed: ${advice.adminReason}`);
      // An expired token, an account that can't take payments, a missing
      // product or Polar being down: trying again without extras won't help.
      const s = failure.status;
      // (A 404 with a discount on may be the discount itself: drop that first.)
      const fatal =
        s == null || s >= 500 || s === 401 || s === 403 || (s === 404 && dropped.has("drop-discount")) || advice.adminReason.includes("can't take payments");
      let next: CheckoutRetry = advice.retry && !dropped.has(advice.retry) ? advice.retry : null;
      if (!next && !fatal) {
        next = (["drop-discount", "drop-customer-link", "drop-email"] as CheckoutRetry[]).find((d) => !dropped.has(d)) ?? null;
      }
      if (!next || fatal) return { ok: false, advice, dropped: tried };
      dropped.add(next);
      tried.push(next);
    }
  }
  return {
    ok: false,
    dropped: tried,
    advice: { userMessage: "Checkout didn't open. Please try again in a minute.", adminReason: "Every retry failed.", retry: null },
  };
}
