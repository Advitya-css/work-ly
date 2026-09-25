import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

import { pool } from "@/lib/db/pool";
import { planForProduct } from "@/lib/payments/polar-plans";
import { grantForOrder, normalizeOrder, userIdForOrder } from "@/lib/payments/polar-grant";

/**
 * POLAR WEBHOOK.
 *
 * Any order event (order.created, order.updated, order.paid) grants Pro
 * once the order itself says it's paid - so it works whichever of those
 * events the endpoint is subscribed to, and a still-pending order (a card
 * that may yet decline) never unlocks anything. A 100% discount order is
 * created already paid, so it's granted on the first event.
 *
 * Granting is idempotent (see lib/payments/polar-grant.ts), so the same
 * order arriving as three events, retried, or also confirmed when the user
 * returns from checkout, gives the same end date every time.
 *
 * The signature is always checked first. If it's valid but this SDK
 * version can't parse the payload (Polar added a field or enum value), we
 * fall back to the raw JSON rather than dropping a real payment.
 */

interface WebhookEvent {
  type: string;
  data: unknown;
}

async function handleOrderPaid(data: unknown): Promise<NextResponse | null> {
  const order = normalizeOrder(data);
  if (!order || !order.paid) return null; // pending: wait for the paid event
  if (!planForProduct(order.productId)) {
    console.error(`[workly:polar] order ${order.id} is for an unknown product ${order.productId}`);
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }
  const userId = await userIdForOrder(order);
  if (!userId) {
    // 500 so Polar retries; a paid order must never be silently dropped.
    console.error(`[workly:polar] paid order ${order.id} has no matching Work-ly user`);
    return NextResponse.json({ error: "No matching user" }, { status: 500 });
  }
  const plan = await grantForOrder(order, userId);
  if (!plan) return NextResponse.json({ error: "Grant failed" }, { status: 500 });
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[workly:polar] POLAR_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  const rawBody = await req.text();
  let event: WebhookEvent;
  try {
    event = validateEvent(rawBody, Object.fromEntries(req.headers.entries()), secret) as WebhookEvent;
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.warn("[workly:polar] rejected a webhook with a bad signature - check POLAR_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    // The signature passed (verification runs before parsing), so the body is genuine.
    try {
      event = JSON.parse(rawBody) as WebhookEvent;
      console.warn(`[workly:polar] SDK couldn't parse ${event.type}; using the raw payload`);
    } catch {
      return NextResponse.json({ received: true }, { status: 202 });
    }
  }

  try {
    switch (event.type) {
      case "order.created":
      case "order.updated":
      case "order.paid": {
        const failure = await handleOrderPaid(event.data);
        if (failure) return failure;
        break;
      }

      case "order.refunded": {
        const order = normalizeOrder(event.data);
        // Only a full refund ends access; a partial one is a goodwill credit.
        if (!order || order.status !== "refunded") break;
        const plan = planForProduct(order.productId);
        const userId = await userIdForOrder(order);
        if (userId && plan) {
          await pool.query(
            `UPDATE users SET "isPro" = false, "proUntil" = now(), "updatedAt" = now() WHERE id = $1 AND "proPlan" = $2`,
            [userId, plan],
          );
          console.log(`[workly:polar] order ${order.id} refunded: ${plan} access ended for user ${userId}`);
        }
        break;
      }

      case "subscription.revoked": {
        // The subscription has definitively ended (e.g. payment failed for
        // good). A normal cancellation isn't handled here: access simply
        // runs to the end of the paid month.
        const sub = normalizeOrder(event.data);
        const userId = sub ? await userIdForOrder(sub) : null;
        if (userId) {
          await pool.query(
            `UPDATE users SET "isPro" = false, "proUntil" = now(), "updatedAt" = now() WHERE id = $1 AND "proPlan" = 'monthly'`,
            [userId],
          );
        }
        break;
      }

      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[workly:polar] webhook handling failed:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
