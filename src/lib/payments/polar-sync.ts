import "server-only";

import { Polar } from "@polar-sh/sdk";

import type { PolarPlan } from "@/lib/payments/polar-plans";
import { grantForOrder, normalizeOrder, orderBelongsTo, type PaidOrder } from "@/lib/payments/polar-grant";

/**
 * ASKING POLAR WHAT THIS USER HAS PAID FOR.
 *
 * Runs when someone lands back from checkout (with the checkout id Polar
 * puts in the success URL) and when they press "Restore purchase". It
 * doesn't wait for the webhook: it looks the orders up directly and grants
 * any paid one that belongs to this account. Safe to run any number of
 * times - see grantForOrder.
 */

export type SyncResult =
  | { status: "granted"; plan: PolarPlan }
  | { status: "pending" }
  | { status: "none" }
  | { status: "error" };

interface SyncUser {
  id: string;
  email?: string | null;
}

function polarClient(): Polar | null {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  return accessToken ? new Polar({ accessToken }) : null;
}

async function ordersWhere(polar: Polar, filter: Parameters<Polar["orders"]["list"]>[0]): Promise<unknown[]> {
  const page = await polar.orders.list({ ...filter, limit: 50 });
  return page.result.items;
}

export async function syncPolarPurchases(user: SyncUser, checkoutId?: string | null): Promise<SyncResult> {
  const polar = polarClient();
  if (!polar) {
    console.error("[workly:polar] POLAR_ACCESS_TOKEN is not set; can't confirm purchases");
    return { status: "error" };
  }

  const raw: unknown[] = [];
  let lookups = 0;
  let lookupsFailed = 0;
  const attempt = async (label: string, fn: () => Promise<unknown[]>) => {
    lookups++;
    try {
      raw.push(...(await fn()));
    } catch (error) {
      lookupsFailed++;
      console.error(`[workly:polar] order lookup by ${label} failed:`, error instanceof Error ? error.message : error);
    }
  };

  if (checkoutId) await attempt("checkout", () => ordersWhere(polar, { checkoutId }));
  await attempt("external customer id", () => ordersWhere(polar, { externalCustomerId: user.id }));
  if (user.email) {
    await attempt("customer email", async () => {
      const customers = await polar.customers.list({ email: user.email!, limit: 5 });
      const found: unknown[] = [];
      for (const c of customers.result.items) found.push(...(await ordersWhere(polar, { customerId: c.id })));
      return found;
    });
  }

  const byId = new Map<string, PaidOrder>();
  for (const item of raw) {
    const order = normalizeOrder(item);
    if (order && orderBelongsTo(order, user)) byId.set(order.id, order);
  }
  const orders = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let granted: PolarPlan | null = null;
  for (const order of orders) {
    try {
      const plan = await grantForOrder(order, user.id);
      if (plan) granted = plan;
    } catch (error) {
      console.error(`[workly:polar] granting order ${order.id} failed:`, error);
      return { status: "error" };
    }
  }
  if (granted) return { status: "granted", plan: granted };
  if (orders.some((o) => o.status === "pending")) return { status: "pending" };

  // Just back from checkout but no order yet: Polar creates the order a
  // moment after the checkout succeeds.
  if (checkoutId) {
    try {
      const checkout = await polar.checkouts.get({ id: checkoutId });
      const owner = checkout.externalCustomerId ?? (checkout.metadata?.user_id as string | undefined);
      if (owner === user.id && (checkout.status === "confirmed" || checkout.status === "succeeded")) {
        return { status: "pending" };
      }
    } catch (error) {
      console.error("[workly:polar] checkout lookup failed:", error instanceof Error ? error.message : error);
    }
  }

  // Only an error if Polar couldn't be asked at all; otherwise there's simply no payment yet.
  return lookupsFailed === lookups ? { status: "error" } : { status: "none" };
}
