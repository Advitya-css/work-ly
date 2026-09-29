import "server-only";

import { pool } from "@/lib/db/pool";
import { PARTNER_PERCENT, parsePartnerKey, partnerKey } from "@/lib/partners-core";

const FOREVER = "2100-01-01T00:00:00Z";

export interface Partner {
  slug: string;
  email: string;
}

export async function listPartners(): Promise<Partner[]> {
  const { rows } = await pool.query<{ key: string }>(`SELECT key FROM rate_limits WHERE key LIKE 'partner:%'`);
  return rows.map((r) => parsePartnerKey(r.key)).filter((p): p is Partner => p !== null);
}

/**
 * Signs a partner up, or returns their existing link. A name already taken
 * by someone else gets a number on the end.
 */
export async function joinPartner(baseSlug: string, email: string): Promise<{ slug: string; isNew: boolean }> {
  const lower = email.trim().toLowerCase();
  const partners = await listPartners();
  const mine = partners.find((p) => p.email === lower);
  if (mine) return { slug: mine.slug, isNew: false };
  const taken = new Set(partners.map((p) => p.slug));
  let slug = baseSlug;
  for (let n = 2; taken.has(slug); n++) slug = `${baseSlug}-${n}`;
  await pool.query(`INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`, [
    partnerKey(slug, lower),
    PARTNER_PERCENT,
    FOREVER,
  ]);
  return { slug, isNew: true };
}
