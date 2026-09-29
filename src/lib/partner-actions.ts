"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { appBaseUrl, notifyFounder, sendReceiptEmail } from "@/lib/email";
import { joinPartner } from "@/lib/partners";
import { PARTNER_MIN_PAYOUT_USD, PARTNER_PERCENT, isEmail, partnerLink, partnerSlug } from "@/lib/partners-core";
import { checkRateLimit } from "@/lib/rate-limit";

const text = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * The partner sign-up form on /partners. Public on purpose (a coach
 * shouldn't need a Work-ly account to get a link); guarded instead by a
 * per-IP rate limit, a hidden honeypot field, length caps and the terms
 * box. Stores only the name slug and email the person typed, and returns
 * their own link.
 */
export async function joinPartnerProgramAction(formData: FormData): Promise<void> {
  if (text(formData.get("company_website"), 200)) redirect("/partners?joined=1"); // bots fill hidden fields

  const name = text(formData.get("name"), 60);
  const email = text(formData.get("email"), 200).toLowerCase();
  const site = text(formData.get("site"), 200);
  const how = text(formData.get("how"), 300);
  if (formData.get("accept_terms") !== "on") redirect("/partners?error=terms#join");
  if (name.length < 2 || !isEmail(email)) redirect("/partners?error=details#join");

  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!(await checkRateLimit(`partner_join:${ip}`, 5, 60 * 60))) redirect("/partners?error=busy#join");

  const { slug, isNew } = await joinPartner(partnerSlug(name), email);
  const link = partnerLink(appBaseUrl(), slug);

  if (isNew) {
    await sendReceiptEmail(email, {
      subject: "Your Work-ly partner link",
      heading: "Here's your partner link",
      paragraphs: [
        `Thanks for joining, ${name.split(/\s+/)[0]}. Share this link with the people you work with:`,
        link,
        `You earn ${PARTNER_PERCENT}% of every purchase made by people who first come to Work-ly through it, paid monthly once you've earned $${PARTNER_MIN_PAYOUT_USD}. Reply to this email with how you'd like to be paid (PayPal or bank transfer) and I'll set it up.`,
      ],
    }).catch(() => false);
    await notifyFounder(`New partner: ${name}`, [
      `${name} <${email}> joined the partner programme.`,
      `Link: ${link}`,
      `Site: ${site || "-"}`,
      `How they'll share it: ${how || "-"}`,
    ]).catch(() => false);
  }
  redirect(`/partners?joined=${encodeURIComponent(slug)}#join`);
}
