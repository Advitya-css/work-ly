import "server-only";

import { pool } from "@/lib/db/pool";
import { PLAN_INTERVAL, planForProduct, type PolarPlan } from "@/lib/payments/polar-plans";

/**
 * TURNING A POLAR ORDER INTO PRO ACCESS - the one place it happens.
 *
 * Two paths call this, so a payment can never go unrewarded:
 *   1. The webhook (Polar tells us).
 *   2. The return from checkout, and the "Restore purchase" button (we ask
 *      Polar). This covers a webhook that isn't subscribed to the right
 *      event, has the wrong secret, or simply hasn't arrived yet.
 *
 * Both are idempotent: Pro runs to max(current end, order time + plan
 * length), so the same order applied twice - or by both paths - changes
 * nothing the second time.
 */

export interface PaidOrder {
  id: string;
  status: string | null;
  paid: boolean;
  productId: string | null;
  createdAt: string;
  customerEmail: string | null;
  /** Work-ly user ids the order carries (checkout metadata, external customer id, ...). */
  userIds: string[];
}

function pick(obj: unknown, ...keys: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) if (rec[k] !== undefined && rec[k] !== null) return rec[k];
  return undefined;
}

function metaUserId(m: unknown): string | null {
  const id = pick(m, "user_id", "userId");
  return typeof id === "string" && id ? id : null;
}

/**
 * Reads an order from either the SDK (camelCase) or Polar's raw JSON
 * (snake_case), so the webhook still works when this SDK version can't
 * parse a newer payload.
 */
export function normalizeOrder(raw: unknown): PaidOrder | null {
  const id = pick(raw, "id");
  if (typeof id !== "string") return null;
  const customer = pick(raw, "customer");
  const subscription = pick(raw, "subscription");
  const created = pick(raw, "createdAt", "created_at");
  const status = pick(raw, "status");
  const productId = pick(raw, "productId", "product_id") ?? pick(pick(raw, "product"), "id");
  const email = pick(customer, "email") ?? pick(raw, "customerEmail", "customer_email");

  const userIds = [
    metaUserId(pick(raw, "metadata")),
    metaUserId(pick(raw, "customFieldData", "custom_field_data")),
    metaUserId(pick(customer, "metadata")),
    metaUserId(pick(subscription, "metadata")),
    (pick(customer, "externalId", "external_id") as string | undefined) ?? null,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  return {
    id,
    status: typeof status === "string" ? status : null,
    paid: pick(raw, "paid") === true || status === "paid" || status === "partially_refunded",
    productId: typeof productId === "string" ? productId : null,
    createdAt: new Date((created as string | Date | undefined) ?? Date.now()).toISOString(),
    customerEmail: typeof email === "string" ? email : null,
    userIds: Array.from(new Set(userIds)),
  };
}

/** The Work-ly account an order belongs to: an id we attached, else the buyer's email. */
export async function userIdForOrder(order: PaidOrder): Promise<string | null> {
  if (order.userIds.length > 0) return order.userIds[0];
  if (!order.customerEmail) return null;
  const { rows } = await pool.query(`SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`, [
    order.customerEmail,
  ]);
  return (rows[0]?.id as string | undefined) ?? null;
}

/** Whether `order` belongs to this signed-in user. Never grant someone else's order. */
export function orderBelongsTo(order: PaidOrder, user: { id: string; email?: string | null }): boolean {
  if (order.userIds.includes(user.id)) return true;
  if (order.userIds.length > 0) return false;
  return Boolean(
    order.customerEmail && user.email && order.customerEmail.trim().toLowerCase() === user.email.trim().toLowerCase(),
  );
}

/**
 * Grants Pro for a paid order. Returns the plan granted, or null when the
 * order isn't paid, is for a product we don't sell, or the user is missing.
 */
export async function grantForOrder(order: PaidOrder, userId: string): Promise<PolarPlan | null> {
  if (!order.paid) return null;
  const plan = planForProduct(order.productId);
  if (!plan) {
    console.error(`[workly:polar] order ${order.id} is for an unknown product ${order.productId}`);
    return null;
  }
  const { rowCount } = await pool.query(
    `UPDATE users
        SET "isPro" = true,
            "proUntil" = GREATEST(COALESCE("proUntil", now()), $3::timestamptz + $4::interval),
            "proPlan" = CASE WHEN "proPlan" = 'yearly' AND $2 <> 'yearly' AND "proUntil" > now() THEN 'yearly' ELSE $2 END,
            "updatedAt" = now()
      WHERE id = $1`,
    [userId, plan, order.createdAt, PLAN_INTERVAL[plan]],
  );
  if (!rowCount) {
    console.error(`[workly:polar] paid order ${order.id}: user ${userId} not found`);
    return null;
  }
  console.log(`[workly:polar] order ${order.id} paid: ${plan} for user ${userId}`);
  return plan;
}

