import { clean } from "@/lib/attribution-core";

/**
 * THE PARTNER PROGRAMME - pure parts.
 *
 * A partner (usually a coach) gets a link, work-ly.in/?ref=partner-<slug>.
 * The first-touch attribution cookie (attribution-core.ts) then credits
 * every order from people who first arrived through it, and admin shows
 * the 30% owed. Each partner is one rate_limits row:
 *   partner:<slug>:<email>   count = commission percent
 */

export const PARTNER_PERCENT = 30;
export const PARTNER_MIN_PAYOUT_USD = 25;

export function partnerSlug(name: string): string {
  return clean(name, 30).replace(/[._]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "partner";
}

export function partnerSource(slug: string): string {
  return `partner-${slug}`;
}

export function partnerLink(appUrl: string, slug: string): string {
  return `${appUrl.replace(/\/$/, "")}/?ref=${partnerSource(slug)}`;
}

export function partnerKey(slug: string, email: string): string {
  return `partner:${slug}:${email.trim().toLowerCase()}`;
}

export function parsePartnerKey(key: string): { slug: string; email: string } | null {
  const m = /^partner:([a-z0-9-]+):(.+@.+)$/.exec(key);
  return m ? { slug: m[1], email: m[2] } : null;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(value.trim());
}
