import "server-only";

import { headers } from "next/headers";
import { Polar } from "@polar-sh/sdk";

import { foundingFromDiscount, type FoundingOffer, type PolarDiscountLike } from "@/lib/payments/founding-core";
import { countryCodeForPlace } from "@/lib/places";
import {
  countryDisplayName,
  isCoveredCountryCode,
  isPppCountry,
  normalizeCountryCode,
  type PppContext,
} from "@/lib/payments/ppp-core";

const CACHE_MS = 5 * 60 * 1000;
let discountCache: { id: string; at: number; value: FoundingOffer | null } | null = null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readPppDiscount(): Promise<FoundingOffer | null> {
  const raw = process.env.POLAR_PPP_DISCOUNT_ID?.trim();
  if (!raw || !process.env.POLAR_ACCESS_TOKEN) return null;

  if (discountCache && discountCache.id === raw && Date.now() - discountCache.at < CACHE_MS) {
    const v = discountCache.value;
    return v && v.endsAt && new Date(v.endsAt).getTime() <= Date.now() ? null : v;
  }

  let value: FoundingOffer | null = null;
  try {
    const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN });
    if (UUID_RE.test(raw)) {
      const discount = await polar.discounts.get({ id: raw });
      value = foundingFromDiscount(discount as unknown as PolarDiscountLike);
    } else {
      // Allow pasting either a Polar discount UUID or the discount code (e.g. WR1EZIAZ).
      const target = raw.toUpperCase();
      const page = await polar.discounts.list({ limit: 100 });
      const match = (page.result?.items ?? []).find(
        (d) => (d as { code?: string | null }).code?.toUpperCase() === target,
      );
      value = foundingFromDiscount(match as unknown as PolarDiscountLike);
    }
  } catch (error) {
    console.warn(`[workly:ppp] couldn't read PPP discount: ${error instanceof Error ? error.message : String(error)}`);
    value = null;
  }
  discountCache = { id: raw, at: Date.now(), value };
  return value;
}

/**
 * Resolves the visitor's country from Vercel's `x-vercel-ip-country` header.
 *
 * Anti-abuse: in production, PPP discount eligibility NEVER uses the
 * user-editable "Where you are now" profile field (otherwise someone in the US
 * could switch their location to India, buy at 45% off, and switch back).
 * In local development where edge headers don't exist, `DEV_COUNTRY` or
 * `profileLocationFallback` lets you preview regional pricing locally.
 */
export async function getPppContext(options?: {
  countryOverride?: string | null;
  profileLocationFallback?: string | null;
}): Promise<PppContext> {
  let rawCode = options?.countryOverride ?? null;
  if (!rawCode) {
    try {
      const h = await headers();
      rawCode = h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || process.env.DEV_COUNTRY || null;
    } catch {
      rawCode = process.env.DEV_COUNTRY || null;
    }
  }
  if (!rawCode && process.env.NODE_ENV !== "production" && options?.profileLocationFallback) {
    rawCode = countryCodeForPlace(options.profileLocationFallback);
  }

  const countryCode = normalizeCountryCode(rawCode);
  if (!countryCode) {
    return { covered: true, countryCode: null, countryName: null, offer: null };
  }

  const covered = isCoveredCountryCode(countryCode);
  const countryName = countryDisplayName(countryCode);
  if (!covered) {
    return { covered: false, countryCode, countryName, offer: null };
  }

  if (!isPppCountry(countryCode, process.env.POLAR_PPP_COUNTRIES)) {
    return { covered: true, countryCode, countryName, offer: null };
  }

  const offer = await readPppDiscount();
  return { covered: true, countryCode, countryName, offer };
}
