import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { pool } from "@/lib/db/pool";
import { GUARANTEE } from "@/lib/business";
import { PAID_PLANS } from "@/lib/pricing";
import { sendLifecycleEmail, type LifecycleEmail } from "@/lib/email";
import { discountedPrice, shortDeadline } from "@/lib/payments/founding-core";
import {
  CHECKOUT_PLAN_CODES,
  LIFECYCLE_KINDS,
  checkoutPlanCode,
  dueLifecycleEmail,
  type LifecycleKind,
} from "@/lib/lifecycle-core";

/**
 * The daily follow-up emails (see lifecycle-core.ts for who gets what).
 * State lives in rate_limits as never-expiring markers - no migration:
 *
 *   lifecycle:sent:<kind>:<userId>   sent once, never again
 *   lifecycle:checkout:<userId>      a checkout opened and not paid; count =
 *                                    plan code, expires_at = opened + 7 days
 *   email_optout:<userId>            unsubscribed from these emails
 */

const FOREVER = "2100-01-01T00:00:00Z";
const CHECKOUT_WINDOW_DAYS = 7;
const MAX_SENDS_PER_RUN = 200;

// ---------------------------------------------------------------------------
// Unsubscribe links: /api/email/unsubscribe?u=<id>&t=<hmac>

function linkSecret(): string {
  return process.env.EMAIL_LINK_SECRET || process.env.AUTH_SECRET || "";
}

export function unsubscribeToken(userId: string): string {
  return createHmac("sha256", linkSecret()).update(`unsubscribe:${userId}`).digest("hex").slice(0, 32);
}

export function unsubscribePath(userId: string): string {
  return `/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}

export function validUnsubscribeToken(userId: string, token: string): boolean {
  if (!linkSecret() || !userId || !token) return false;
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function optOut(userId: string): Promise<void> {
  await pool.query(`INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 1, $2) ON CONFLICT (key) DO NOTHING`, [
    `email_optout:${userId}`,
    FOREVER,
  ]);
}

// ---------------------------------------------------------------------------
// Checkout markers (written by createPolarCheckout, cleared on payment)

export async function markCheckoutOpened(userId: string, plan: string): Promise<void> {
  await pool
    .query(
      `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))
       ON CONFLICT (key) DO UPDATE SET count = EXCLUDED.count, expires_at = EXCLUDED.expires_at`,
      [`lifecycle:checkout:${userId}`, checkoutPlanCode(plan), CHECKOUT_WINDOW_DAYS],
    )
    .catch((e) => console.warn("[workly:lifecycle] could not mark checkout:", e instanceof Error ? e.message : e));
}

export async function clearCheckoutMarker(userId: string): Promise<void> {
  await pool.query(`DELETE FROM rate_limits WHERE key = $1`, [`lifecycle:checkout:${userId}`]).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// The emails

interface Candidate {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  isPayingPro: boolean;
}

function firstName(name: string | null): string {
  const n = (name ?? "").trim().split(/\s+/)[0];
  return n && n.length <= 30 ? n : "there";
}

async function latestReport(userId: string) {
  const { rows } = await pool.query(
    `SELECT o.id, j.title, j.company, a."fitScore", a.gaps
       FROM opportunities o
       JOIN jobs j ON j.id = o."jobId"
       LEFT JOIN job_analyses a ON a."jobId" = j.id
      WHERE o."userId" = $1
      ORDER BY o."createdAt" DESC
      LIMIT 1`,
    [userId],
  );
  const r = rows[0];
  if (!r) return null;
  const gaps = Array.isArray(r.gaps) ? (r.gaps as { title?: string }[]) : [];
  return {
    id: String(r.id),
    title: (r.title as string | null) ?? "this role",
    company: (r.company as string | null) ?? null,
    fit: typeof r.fitScore === "number" ? r.fitScore : null,
    topGap: gaps.map((g) => g?.title).find((t): t is string => typeof t === "string" && t.trim().length > 0) ?? null,
  };
}

async function buildEmail(kind: LifecycleKind, user: Candidate, checkoutPlan: string): Promise<LifecycleEmail | null> {
  const hi = `Hi ${firstName(user.name)},`;
  const unsub = unsubscribePath(user.id);
  const pass = PAID_PLANS.find((p) => p.interval === "quarterly")!;

  if (kind === "checkout") {
    const plan = PAID_PLANS.find((p) => p.interval === checkoutPlan) ?? pass;
    return {
      subject: "Your Work-ly upgrade is still open",
      heading: "You were one step from Pro",
      paragraphs: [
        hi,
        `You started upgrading to the ${plan.name} but didn't finish. If something got in the way - the price, a question, or the checkout itself - just reply and tell me. I read every email.`,
        `Every first purchase comes with a ${GUARANTEE.sentence}.`,
        "If you'd rather have a person check your applications with you, the 14-day Application Sprint includes 3 months of Pro: work-ly.in/sprint",
      ],
      cta: { label: `Finish upgrading to the ${plan.name}`, path: `/settings?plan=${plan.interval}#plan` },
      unsubscribePath: unsub,
    };
  }

  const report = await latestReport(user.id);

  if (kind === "welcome") {
    if (!report) {
      return {
        subject: "Check your first job with Work-ly",
        heading: "Which job are you going for?",
        paragraphs: [
          hi,
          "Thanks for signing up. Work-ly works best with one real job in mind: paste it, and you'll see requirement by requirement what your resume already proves and what could get you screened out.",
          "It takes about a minute.",
        ],
        cta: { label: "Check a job", path: "/analyze-job" },
        unsubscribePath: unsub,
      };
    }
    const where = report.company ? ` at ${report.company}` : "";
    return {
      subject: `Your Fit report for ${report.title}`,
      heading: report.fit != null ? `${report.fit}/100 for ${report.title}${where}` : `Your report for ${report.title}${where}`,
      paragraphs: [
        hi,
        "Your report shows what your resume already proves for this job and what could get you screened out.",
        "The quickest next step is a resume rewritten for this exact job. Work-ly Pro does that - and the cover letter - using only what's already true about you.",
      ],
      cta: { label: "Open your report", path: `/opportunities/${report.id}` },
      unsubscribePath: unsub,
    };
  }

  if (kind === "gap") {
    if (!report?.topGap) return null; // nothing specific to say: skip rather than send filler
    return {
      subject: "One gap you could close this week",
      heading: `For ${report.title}: ${report.topGap}`,
      paragraphs: [
        hi,
        `Of everything in your report for ${report.title}, this is the gap most worth closing first: ${report.topGap}. Your report shows how.`,
        "While you work on it, Pro rewrites your resume for the job so your real strengths come first.",
      ],
      cta: { label: "See how to close it", path: `/opportunities/${report.id}` },
      unsubscribePath: unsub,
    };
  }

  // founding (loaded here, not at the top, so importing this module never
  // pulls in the Polar SDK for callers that only mark checkouts)
  const { getFoundingOffer } = await import("@/lib/payments/founding");
  const offer = await getFoundingOffer();
  if (offer) {
    const deadline = shortDeadline(offer.endsAt);
    return {
      subject: `Founding price: ${offer.percentOff}% off Work-ly Pro${deadline ? `, until ${deadline}` : ""}`,
      heading: `${offer.percentOff}% off for the first ${offer.spotsTotal ?? 50} members`,
      paragraphs: [
        hi,
        `Work-ly is new, and the first members get Pro at a founding price: the 3-Month Pass is ${discountedPrice(pass.priceUsd, offer.percentOff)} instead of ${pass.price}${offer.spotsLeft != null ? `, with ${offer.spotsLeft} spots left` : ""}${deadline ? ` until ${deadline}` : ""}.`,
        "Pro tailors your resume and cover letter to each job, preps you for interviews, and checks new listings for you every night.",
        `${GUARANTEE.sentence}.`,
      ],
      cta: { label: "See founding prices", path: "/pricing" },
      unsubscribePath: unsub,
    };
  }
  return {
    subject: "Ready to apply?",
    heading: "Apply with a resume written for the job",
    paragraphs: [
      hi,
      `The 3-Month Pass (${pass.price}, one payment, no renewal) covers a focused search: a tailored resume and cover letter for every job, interview prep, and new listings checked every night.`,
      `${GUARANTEE.sentence}.`,
    ],
    cta: { label: "See plans", path: "/pricing" },
    unsubscribePath: unsub,
  };
}

// ---------------------------------------------------------------------------
// The daily run

export async function runLifecycleEmails(now = new Date()): Promise<{ considered: number; sent: number; failed: number }> {
  const { rows: users } = await pool.query(
    `SELECT u.id, u.email, u.name, u."createdAt", u."isPro", u."proUntil", u."proPlan"
       FROM users u
      WHERE u."emailVerified" = true
        AND (u."createdAt" > now() - interval '8 days'
             OR EXISTS (SELECT 1 FROM rate_limits r WHERE r.key = 'lifecycle:checkout:' || u.id AND r.expires_at > now()))
      ORDER BY u."createdAt" ASC
      LIMIT 2000`,
  );
  if (users.length === 0) return { considered: 0, sent: 0, failed: 0 };

  const candidates: Candidate[] = users.map((u) => ({
    id: String(u.id),
    email: String(u.email),
    name: (u.name as string | null) ?? null,
    createdAt: new Date(u.createdAt),
    isPayingPro:
      u.isPro === true && u.proPlan !== "trial" && (u.proUntil == null || new Date(u.proUntil).getTime() > now.getTime()),
  }));

  const keys = candidates.flatMap((c) => [
    `email_optout:${c.id}`,
    `lifecycle:checkout:${c.id}`,
    ...LIFECYCLE_KINDS.map((k) => `lifecycle:sent:${k}:${c.id}`),
  ]);
  const { rows: markerRows } = await pool.query<{ key: string; count: number; expires_at: Date }>(
    `SELECT key, count, expires_at FROM rate_limits WHERE key = ANY($1::text[])`,
    [keys],
  );
  const markers = new Map(markerRows.map((r) => [r.key, r]));

  let sent = 0;
  let failed = 0;
  for (const user of candidates) {
    if (sent >= MAX_SENDS_PER_RUN) break;
    const checkout = markers.get(`lifecycle:checkout:${user.id}`);
    const checkoutLive = checkout && new Date(checkout.expires_at).getTime() > now.getTime();
    const kind = dueLifecycleEmail({
      createdAt: user.createdAt,
      now,
      isPayingPro: user.isPayingPro,
      optedOut: markers.has(`email_optout:${user.id}`),
      sent: new Set(LIFECYCLE_KINDS.filter((k) => markers.has(`lifecycle:sent:${k}:${user.id}`))),
      checkoutOpenedAt: checkoutLive
        ? new Date(new Date(checkout.expires_at).getTime() - CHECKOUT_WINDOW_DAYS * 86_400_000)
        : null,
    });
    if (!kind) continue;

    // Claim before sending, so a crash or a second run can never double-send.
    const sentKey = `lifecycle:sent:${kind}:${user.id}`;
    const claim = await pool.query(
      `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 1, $2) ON CONFLICT (key) DO NOTHING RETURNING key`,
      [sentKey, FOREVER],
    );
    if (!claim.rowCount) continue;

    try {
      const planCode = Number(checkout?.count ?? 0);
      const email = await buildEmail(kind, user, CHECKOUT_PLAN_CODES.at(planCode) ?? "");
      if (!email) continue; // nothing worth saying; stays claimed so it isn't retried
      if (await sendLifecycleEmail(user.email, email)) sent++;
      else {
        failed++;
        await pool.query(`DELETE FROM rate_limits WHERE key = $1`, [sentKey]); // retry tomorrow
      }
    } catch (error) {
      failed++;
      await pool.query(`DELETE FROM rate_limits WHERE key = $1`, [sentKey]).catch(() => undefined);
      console.error(`[workly:lifecycle] ${kind} for ${user.id} failed:`, error);
    }
  }
  return { considered: candidates.length, sent, failed };
}
