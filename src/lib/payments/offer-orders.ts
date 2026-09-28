import "server-only";

import { pool } from "@/lib/db/pool";
import { recordPaidOrder } from "@/lib/attribution";
import { appBaseUrl, notifyFounder, sendReceiptEmail } from "@/lib/email";
import { OFFERS, type OfferKey } from "@/lib/payments/offers";
import { userIdForOrder, type PaidOrder } from "@/lib/payments/polar-grant";
import { groupCodeForOrder, redeemUrl, seatSecret, type SeatPrefix } from "@/lib/payments/seat-codes-core";
import { createSeatCode, disableUnusedSeats, getSeatGroup, type SeatGroup } from "@/lib/payments/seat-codes";
import { recordSprintPaid } from "@/lib/sprint";

/**
 * TURNING A PAID OFFER INTO WHAT WAS BOUGHT - the Sprint and the seat packs
 * (see offers.ts). Called by the webhook and by the thank-you pages, so a
 * payment is delivered even if the webhook is late. Every step is
 * idempotent; the emails go out once, on the first delivery only.
 *
 * Each paid offer order is also counted for the revenue report:
 *   offer:<key>:<YYYY-MM-DD>:<orderId>   count = amount in cents
 */

const FOREVER = "2100-01-01T00:00:00Z";

function prefixFor(key: OfferKey): SeatPrefix {
  if (key === "gift") return "GIFT";
  if (key === "coach") return "COACH";
  return "TEAM";
}

/** The seat code belonging to a paid seat-offer order. */
export function seatCodeForOrder(orderId: string, key: OfferKey): string {
  return groupCodeForOrder(orderId, prefixFor(key), seatSecret());
}

export type OfferDelivery =
  | { kind: "sprint"; userId: string }
  | { kind: "seats"; group: SeatGroup }
  | { kind: "skipped"; reason: string };

async function markDelivered(key: OfferKey, order: PaidOrder): Promise<boolean> {
  const { rowCount } = await pool.query(
    `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
    [`offer:${key}:${order.createdAt.slice(0, 10)}:${order.id}`, Math.max(0, Math.round(order.amountCents ?? 0)), FOREVER],
  );
  return (rowCount ?? 0) > 0;
}

export async function deliverOfferOrder(order: PaidOrder, key: OfferKey): Promise<OfferDelivery> {
  if (!order.paid) return { kind: "skipped", reason: "not paid" };
  const offer = OFFERS[key];

  if (key === "sprint") {
    const userId = await userIdForOrder(order);
    if (!userId) throw new Error(`sprint order ${order.id} has no matching Work-ly user`);
    const { rowCount } = await pool.query(
      `UPDATE users
          SET "isPro" = true,
              "proUntil" = GREATEST(COALESCE("proUntil", now()), $2::timestamptz + make_interval(months => $3::int)),
              "proPlan" = CASE WHEN "proPlan" = 'yearly' AND "proUntil" > now() THEN 'yearly' ELSE 'sprint' END,
              "updatedAt" = now()
        WHERE id = $1`,
      [userId, order.createdAt, offer.months],
    );
    if (!rowCount) throw new Error(`sprint order ${order.id}: user ${userId} not found`);
    await recordSprintPaid(order.id, userId, order.createdAt);

    if (await markDelivered(key, order)) {
      await recordPaidOrder({
        orderId: order.id,
        createdAt: order.createdAt,
        source: order.source,
        campaign: order.campaign,
        amountCents: order.amountCents,
      });
      const { rows } = await pool.query(`SELECT email, name FROM users WHERE id = $1`, [userId]);
      const email = (rows[0]?.email as string | undefined) ?? order.customerEmail;
      if (email) {
        await sendReceiptEmail(email, {
          subject: "Your Application Sprint is booked",
          heading: "Your Sprint starts with one short form",
          paragraphs: [
            "Thanks for booking the Application Sprint. Pro is already on for your account, for 3 months.",
            "Your 14 days start when you send the intake form: your resume on Work-ly, the roles you want, and up to five postings. I'll reply within one business day with your resume review.",
          ],
          cta: { label: "Fill in the intake form", path: "/sprint-intake" },
        }).catch(() => false);
      }
      await notifyFounder(`New Sprint: ${email ?? userId}`, [
        `A Sprint was paid: ${email ?? "unknown email"} (${rows[0]?.name ?? "no name"}).`,
        `Order ${order.id}, ${((order.amountCents ?? 0) / 100).toFixed(2)} USD.`,
        `They've been sent the intake form. See the Sprints table on /admin.`,
      ]).catch(() => false);
    }
    return { kind: "sprint", userId };
  }

  // Seat offers: one code for the whole pack.
  const group = await createSeatCode({
    group: seatCodeForOrder(order.id, key),
    seats: offer.seats,
    months: offer.months,
    label: `${key}-order`,
  });

  if (await markDelivered(key, order)) {
    await recordPaidOrder({
      orderId: order.id,
      createdAt: order.createdAt,
      source: order.source,
      campaign: order.campaign,
      amountCents: order.amountCents,
    });
    const url = redeemUrl(appBaseUrl(), group.group);
    if (order.customerEmail) {
      const gift = key === "gift";
      await sendReceiptEmail(order.customerEmail, {
        subject: gift ? "Your Work-ly gift code" : `Your Work-ly ${offer.name}: ${offer.seats} seats`,
        heading: gift ? "Here's the 3-Month Pass to give" : `Your code for ${offer.seats} people`,
        paragraphs: gift
          ? [
              "Thanks for buying a 3-Month Pass for someone. Send them the code below, or this link:",
              url,
              "They sign up (or sign in) and get 3 months of Work-ly Pro on their own account. The pass starts when they redeem it, not today.",
            ]
          : [
              `Thanks for buying the ${offer.name}. One code covers all ${offer.seats} seats: share it with the people you're supporting, or send them this link:`,
              url,
              `Each person signs up (or signs in) and gets ${offer.months} months of Work-ly Pro on their own account, starting when they redeem. Their resumes and applications stay private to them; you can ask me for a count of seats used at any time.`,
              "Reply to this email if you'd like an onboarding call or a welcome note for your group.",
            ],
        code: group.group,
      }).catch(() => false);
    }
    await notifyFounder(`${offer.name} sold`, [
      `${offer.name} paid by ${order.customerEmail ?? "unknown email"}.`,
      `Order ${order.id}, ${((order.amountCents ?? 0) / 100).toFixed(2)} USD. Code ${group.group} (${group.seats} seats, ${group.months} months each).`,
      key === "pilot" || key === "licence" ? "Book the onboarding call." : "",
    ].filter(Boolean)).catch(() => false);
  }
  return { kind: "seats", group };
}

/** A fully refunded offer: the Sprint's Pro ends; a pack's unused seats are switched off. */
export async function refundOfferOrder(order: PaidOrder, key: OfferKey): Promise<void> {
  if (key === "sprint") {
    const userId = await userIdForOrder(order);
    if (userId) {
      await pool.query(
        `UPDATE users SET "isPro" = false, "proUntil" = now(), "updatedAt" = now() WHERE id = $1 AND "proPlan" = 'sprint'`,
        [userId],
      );
    }
    return;
  }
  const group = seatCodeForOrder(order.id, key);
  if (await getSeatGroup(group)) await disableUnusedSeats(group);
}

/** Orders by offer since `sinceDay`, for the admin revenue report. */
export async function offerSales(sinceDay: string): Promise<Record<OfferKey, { orders: number; cents: number }>> {
  const out = Object.fromEntries(
    (Object.keys(OFFERS) as OfferKey[]).map((k) => [k, { orders: 0, cents: 0 }]),
  ) as Record<OfferKey, { orders: number; cents: number }>;
  const { rows } = await pool.query<{ key: string; count: number }>(`SELECT key, count FROM rate_limits WHERE key LIKE 'offer:%'`);
  for (const r of rows) {
    const [, k, day] = r.key.split(":");
    if (!day || day < sinceDay || !(k in out)) continue;
    out[k as OfferKey].orders += 1;
    out[k as OfferKey].cents += Number(r.count);
  }
  return out;
}
