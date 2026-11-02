import "server-only";

import { pool } from "@/lib/db/pool";
import { isDisposableEmail } from "@/lib/disposable-email";
import { BUSINESS } from "@/lib/business";
import { getFoundingOffer } from "@/lib/payments/founding";
import { discountedPrice } from "@/lib/payments/founding-core";
import { PAID_PLANS } from "@/lib/pricing";
import { HEAT_ORDER, draftEmail, heatOf, type Draft, type Heat, type OfferForEmail, type Signals } from "@/lib/founding-ten-core";

export interface QueueRow {
  userId: string;
  email: string;
  heat: Heat;
  draft: Draft;
  signedUp: Date;
  jobsChecked: number;
}

/**
 * Everyone worth a personal email today: free accounts, not unsubscribed,
 * not emailed from the admin box in the last 90 days, real addresses only.
 * Hottest first (opened checkout, then tried Pro, then checked a job...),
 * newest first within each.
 */
export async function foundingTenQueue(limit = 60): Promise<{ rows: QueueRow[]; offer: OfferForEmail | null }> {
  const founding = await getFoundingOffer().catch(() => null);
  const monthly = PAID_PLANS.find((p) => p.interval === "monthly");
  const offer: OfferForEmail | null =
    founding && monthly
      ? {
          percentOff: founding.percentOff,
          forLife: founding.duration === "forever",
          spotsLeft: founding.spotsLeft,
          monthlyPrice: discountedPrice(monthly.priceUsd, founding.percentOff),
        }
      : null;

  const { rows } = await pool.query(`
    SELECT
      u.id, u.email, u.name, u."createdAt", u."proPlan",
      (SELECT COUNT(*)::int FROM documents d WHERE d."userId" = u.id) AS resumes,
      (SELECT COUNT(*)::int FROM jobs j WHERE j."userId" = u.id) AS jobs_checked,
      (SELECT json_build_object('title', j.title, 'company', j.company) FROM jobs j
         WHERE j."userId" = u.id AND j.title IS NOT NULL ORDER BY j."createdAt" DESC LIMIT 1) AS last_job,
      EXISTS (SELECT 1 FROM rate_limits r WHERE r.key = 'lifecycle:checkout:' || u.id AND r.expires_at > now()) AS checkout_open,
      EXISTS (SELECT 1 FROM rate_limits r WHERE r.key = 'lifecycle:sent:trial_ended:' || u.id) AS trial_ended
    FROM users u
    WHERE (u."isPro" = false OR u."proPlan" IN ('trial', 'referral'))
      AND NOT EXISTS (SELECT 1 FROM rate_limits r WHERE r.key = 'email_optout:' || u.id)
      AND NOT EXISTS (SELECT 1 FROM rate_limits r WHERE r.key LIKE 'outreach:%:' || lower(u.email) AND r.expires_at > now())
      AND NOT EXISTS (SELECT 1 FROM rate_limits r WHERE r.key = 'refund_first_' || u.id)
    ORDER BY u."createdAt" DESC
    LIMIT 500
  `);

  const out: QueueRow[] = [];
  for (const r of rows) {
    const email = String(r.email ?? "");
    if (!email || isDisposableEmail(email) || /@example\.|\.test$/i.test(email)) continue;
    if (email.toLowerCase() === BUSINESS.supportEmail.toLowerCase()) continue; // not yourself
    const signals: Signals = {
      name: (r.name as string | null) ?? null,
      email,
      checkoutOpen: Boolean(r.checkout_open),
      hadTrial: Boolean(r.trial_ended) || r.proPlan === "trial",
      jobsChecked: Number(r.jobs_checked) || 0,
      resumes: Number(r.resumes) || 0,
      lastJob: (r.last_job as Signals["lastJob"]) ?? null,
    };
    out.push({
      userId: String(r.id),
      email,
      heat: heatOf(signals),
      draft: draftEmail(signals, offer),
      signedUp: new Date(r.createdAt as string),
      jobsChecked: signals.jobsChecked,
    });
  }
  out.sort((a, b) => HEAT_ORDER.indexOf(a.heat) - HEAT_ORDER.indexOf(b.heat) || b.signedUp.getTime() - a.signedUp.getTime());
  return { rows: out.slice(0, limit), offer };
}
