import "server-only";

import { pool } from "@/lib/db/pool";
import { BUSINESS } from "@/lib/business";
import { appBaseUrl } from "@/lib/email";
import { unsubscribePath } from "@/lib/lifecycle";
import {
  OUTREACH_DAILY_CAP,
  isPlausibleEmail,
  outreachFooter,
  outreachKey,
  parseOutreachKey,
  textToHtml,
  type OutreachKind,
} from "@/lib/outreach-core";

const LOG_DAYS = 90;

export type OutreachResult = { ok: true } | { ok: false; error: string };

/**
 * Sends one personal email through Resend from advitya@work-ly.in (see
 * outreach-core.ts). Refuses someone who unsubscribed, a second email to
 * the same address on the same day, and more than the daily cap - a new
 * sending domain that suddenly mails a lot lands in spam for everyone.
 */
export async function sendOutreachEmail(input: {
  to: string;
  subject: string;
  body: string;
  kind: OutreachKind;
  allowRepeatToday?: boolean;
}): Promise<OutreachResult> {
  const to = input.to.trim().toLowerCase();
  const subject = input.subject.trim().slice(0, 150);
  const body = input.body.trim().slice(0, 5000);
  if (!isPlausibleEmail(to)) return { ok: false, error: "That email address doesn't look right." };
  if (!subject || body.length < 20) return { ok: false, error: "Add a subject and a message." };

  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY isn't set, so nothing can be sent." };

  const day = new Date().toISOString().slice(0, 10);
  const { rows: today } = await pool.query<{ key: string }>(`SELECT key FROM rate_limits WHERE key LIKE $1`, [`outreach:${day}:%`]);
  if (today.length >= OUTREACH_DAILY_CAP) {
    return { ok: false, error: `That's ${OUTREACH_DAILY_CAP} emails today - the daily limit that keeps your domain out of spam. Send the rest tomorrow.` };
  }
  if (!input.allowRepeatToday && today.some((r) => r.key === outreachKey(day, to))) {
    return { ok: false, error: "You already emailed this address today. Tick 'send again anyway' if you mean to." };
  }

  let unsubscribeUrl: string | undefined;
  if (input.kind === "user") {
    const { rows } = await pool.query(`SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`, [to]);
    const userId = rows[0]?.id as string | undefined;
    if (!userId) return { ok: false, error: "No Work-ly account has that email. Choose 'coach or program' for someone who hasn't signed up." };
    const { rows: out } = await pool.query(`SELECT 1 FROM rate_limits WHERE key = $1`, [`email_optout:${userId}`]);
    if (out.length > 0) return { ok: false, error: "This person unsubscribed from Work-ly emails. Don't email them." };
    unsubscribeUrl = `${appBaseUrl()}${unsubscribePath(userId)}`;
  }

  const footer = outreachFooter(input.kind, { address: BUSINESS.address, unsubscribeUrl });
  const fromDomain = (process.env.RESEND_FROM_DOMAIN || "work-ly.in").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:560px;">${textToHtml(body)}<p style="margin:24px 0 0;font-size:12px;color:#888;">${textToHtml(footer).replace(/<\/?p[^>]*>/g, "")}</p></div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Advitya Bansal <advitya@${fromDomain}>`,
      to,
      reply_to: BUSINESS.supportEmail,
      subject,
      text: `${body}\n\n--\n${footer}`,
      html,
      headers: unsubscribeUrl
        ? { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : { "List-Unsubscribe": `<mailto:${BUSINESS.supportEmail}?subject=unsubscribe>` },
    }),
  }).catch(() => null);

  if (!res || !res.ok) {
    const detail = res ? await res.text().catch(() => "") : "network error";
    console.error("[workly:outreach] Resend refused:", res?.status, detail.slice(0, 300));
    return { ok: false, error: "Resend didn't accept it. Check the Resend dashboard (the sending domain must be verified)." };
  }

  await pool.query(
    `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 1, now() + make_interval(days => $2))
     ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1`,
    [outreachKey(day, to), LOG_DAYS],
  );
  return { ok: true };
}

/** Who was emailed from the admin box recently, newest first. */
export async function recentOutreach(limit = 50): Promise<{ day: string; email: string; times: number }[]> {
  const { rows } = await pool.query<{ key: string; count: number }>(`SELECT key, count FROM rate_limits WHERE key LIKE 'outreach:%'`);
  return rows
    .map((r) => {
      const p = parseOutreachKey(r.key);
      return p ? { ...p, times: Number(r.count) } : null;
    })
    .filter((r): r is { day: string; email: string; times: number } => r !== null)
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, limit);
}
