import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

import { pool } from "@/lib/db/pool";
import { PLAN_INTERVAL, planForProduct } from "@/lib/payments/polar-plans";

type Meta = Record<string, unknown> | null | undefined;

function metaUserId(...sources: Meta[]): string | null {
  for (const m of sources) {
    const id = m?.user_id ?? m?.userId;
    if (typeof id === "string" && id) return id;
  }
  return null;
}

/** Our user for an order: the id we attached at checkout, else the account with the buyer's email. */
async function resolveUserId(ids: (string | null)[], email: string | null | undefined): Promise<string | null> {
  const direct = ids.find((id): id is string => Boolean(id));
  if (direct) return direct;
  if (!email) return null;
  const { rows } = await pool.query(`SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`, [email]);
  return (rows[0]?.id as string | undefined) ?? null;
}

/**
 * POLAR WEBHOOK.
 *
 * Access is granted on `order.paid` only. `order.created` fires while the
 * order is still pending - granting there would unlock Pro for a card that
 * then declines. `order.paid` covers the first payment for every plan AND
 * each monthly renewal, so subscriptions need no separate "extend" logic.
 *
 * The event objects from the SDK are camelCase (productId, customer,
 * createdAt) - reading snake_case fields silently gave undefined, which
 * made every 3-Month and Yearly Pass grant only one month.
 *
 * Idempotent: Polar retries webhooks, so Pro runs to
 * max(current end, order time + plan length) rather than adding the length
 * again on every delivery.
 */
export async function POST(req: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[workly:polar] POLAR_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  const rawBody = await req.text();
  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(rawBody, Object.fromEntries(req.headers.entries()), secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.warn("[workly:polar] rejected a webhook with a bad signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    // Signed correctly but an event type or shape this SDK version doesn't
    // know. Acknowledge it so Polar doesn't retry (and eventually disable
    // the endpoint) over events we don't use anyway.
    console.warn("[workly:polar] ignored an event the SDK couldn't parse:", error instanceof Error ? error.message : error);
    return NextResponse.json({ received: true }, { status: 202 });
  }

  try {
    switch (event.type) {
      case "order.paid": {
        const order = event.data;
        const plan = planForProduct(order.productId);
        if (!plan) {
          console.error(`[workly:polar] order ${order.id} is for an unknown product ${order.productId}`);
          return NextResponse.json({ error: "Unknown product" }, { status: 400 });
        }
        const userId = await resolveUserId(
          [
            metaUserId(order.metadata as Meta),
            metaUserId(order.customer?.metadata as Meta),
            metaUserId(order.subscription?.metadata as Meta),
            order.customer?.externalId ?? null,
          ],
          order.customer?.email,
        );
        if (!userId) {
          // 500 so Polar retries; a paid order must never be silently dropped.
          console.error(`[workly:polar] paid order ${order.id} has no matching Work-ly user`);
          return NextResponse.json({ error: "No matching user" }, { status: 500 });
        }
        const orderTime = new Date(order.createdAt ?? Date.now()).toISOString();
        const { rowCount } = await pool.query(
          `UPDATE users
              SET "isPro" = true,
                  "proUntil" = GREATEST(COALESCE("proUntil", now()), $3::timestamptz + $4::interval),
                  "proPlan" = CASE WHEN "proPlan" = 'yearly' AND $2 <> 'yearly' AND "proUntil" > now() THEN 'yearly' ELSE $2 END,
                  "updatedAt" = now()
            WHERE id = $1`,
          [userId, plan, orderTime, PLAN_INTERVAL[plan]],
        );
        if (!rowCount) {
          console.error(`[workly:polar] paid order ${order.id}: user ${userId} not found`);
          return NextResponse.json({ error: "User not found" }, { status: 500 });
        }
        console.log(`[workly:polar] order ${order.id} paid: ${plan} for user ${userId}`);
        break;
      }

      case "order.refunded": {
        const order = event.data;
        // Only a full refund ends access; a partial one is a goodwill credit.
        if (order.status !== "refunded") break;
        const plan = planForProduct(order.productId);
        const userId = await resolveUserId(
          [metaUserId(order.metadata as Meta), metaUserId(order.customer?.metadata as Meta), order.customer?.externalId ?? null],
          order.customer?.email,
        );
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
        // runs to the end of the paid month set by order.paid.
        const sub = event.data;
        const userId = await resolveUserId(
          [metaUserId(sub.metadata as Meta), metaUserId(sub.customer?.metadata as Meta), sub.customer?.externalId ?? null],
          sub.customer?.email,
        );
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
