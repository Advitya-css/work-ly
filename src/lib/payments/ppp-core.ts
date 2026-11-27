import { COVERED_COUNTRY_CODES } from "@/lib/places";
import type { PublicFoundingOffer } from "@/lib/payments/founding-core";

/**
 * REGIONAL PURCHASING POWER PARITY (PPP) - pure helpers.
 *
 * Designed for minimal setup: one Polar discount ID (POLAR_PPP_DISCOUNT_ID)
 * covers all emerging-market countries among the 24 countries Work-ly supports.
 * Visitors from countries outside the 24 covered markets see a friendly
 * "coming soon" note instead of broken local job discovery.
 */

export const DEFAULT_PPP_COUNTRY_CODES = new Set(["IN", "BR", "MX", "ZA", "PL", "PT"]);

export interface PppContext {
  covered: boolean;
  countryCode: string | null;
  countryName: string | null;
  /** Non-null only when the visitor is in a covered PPP country and POLAR_PPP_DISCOUNT_ID is active. */
  offer: (PublicFoundingOffer & { discountId: string }) | null;
}

export type PublicPppContext = {
  covered: boolean;
  countryCode: string | null;
  countryName: string | null;
  /** Country code used purely for display currency (from "Where you are now" or IP). */
  displayCountryCode: string | null;
  offer: PublicFoundingOffer | null;
};

export interface CurrencyConfig {
  code: string;
  symbol: string;
  rateFromUsd: number;
  decimals: number;
}

const CURRENCY_BY_COUNTRY: Record<string, CurrencyConfig> = {
  US: { code: "USD", symbol: "$", rateFromUsd: 1, decimals: 2 },
  IN: { code: "INR", symbol: "₹", rateFromUsd: 84.5, decimals: 0 },
  GB: { code: "GBP", symbol: "£", rateFromUsd: 0.79, decimals: 2 },
  CA: { code: "CAD", symbol: "CA$", rateFromUsd: 1.39, decimals: 2 },
  AU: { code: "AUD", symbol: "A$", rateFromUsd: 1.54, decimals: 2 },
  NZ: { code: "NZD", symbol: "NZ$", rateFromUsd: 1.69, decimals: 2 },
  SG: { code: "SGD", symbol: "S$", rateFromUsd: 1.34, decimals: 2 },
  AE: { code: "AED", symbol: "AED ", rateFromUsd: 3.67, decimals: 0 },
  ZA: { code: "ZAR", symbol: "R ", rateFromUsd: 18.1, decimals: 0 },
  BR: { code: "BRL", symbol: "R$", rateFromUsd: 5.8, decimals: 2 },
  MX: { code: "MXN", symbol: "MX$", rateFromUsd: 20.2, decimals: 0 },
  PL: { code: "PLN", symbol: "zł ", rateFromUsd: 4.05, decimals: 0 },
  CH: { code: "CHF", symbol: "CHF ", rateFromUsd: 0.88, decimals: 2 },
  SE: { code: "SEK", symbol: "SEK ", rateFromUsd: 10.9, decimals: 0 },
  DK: { code: "DKK", symbol: "DKK ", rateFromUsd: 6.9, decimals: 0 },
  DE: { code: "EUR", symbol: "€", rateFromUsd: 0.92, decimals: 2 },
  FR: { code: "EUR", symbol: "€", rateFromUsd: 0.92, decimals: 2 },
  NL: { code: "EUR", symbol: "€", rateFromUsd: 0.92, decimals: 2 },
  IE: { code: "EUR", symbol: "€", rateFromUsd: 0.92, decimals: 2 },
  ES: { code: "EUR", symbol: "€", rateFromUsd: 0.92, decimals: 2 },
  IT: { code: "EUR", symbol: "€", rateFromUsd: 0.92, decimals: 2 },
  AT: { code: "EUR", symbol: "€", rateFromUsd: 0.92, decimals: 2 },
  BE: { code: "EUR", symbol: "€", rateFromUsd: 0.92, decimals: 2 },
  PT: { code: "EUR", symbol: "€", rateFromUsd: 0.92, decimals: 2 },
};

export function currencyForCountry(code: string | null | undefined): CurrencyConfig {
  const norm = normalizeCountryCode(code);
  return (norm && CURRENCY_BY_COUNTRY[norm]) || CURRENCY_BY_COUNTRY.US;
}

/** Formats a USD amount (after optional percentOff) in the visitor's local currency. */
export function formatDisplayPrice(priceUsd: number, percentOff: number, countryCode: string | null | undefined): {
  primary: string;
  usd: string;
  isLocalCurrency: boolean;
  currencyCode: string;
} {
  const discountedCents = Math.floor(Math.round(priceUsd * 100) * (1 - percentOff / 100));
  const discountedUsd = discountedCents / 100;
  const usd = `$${discountedUsd.toFixed(2)}`;
  const cfg = currencyForCountry(countryCode);
  if (cfg.code === "USD") {
    return { primary: usd, usd, isLocalCurrency: false, currencyCode: "USD" };
  }
  const localAmount = discountedUsd * cfg.rateFromUsd;
  const formatted =
    cfg.decimals === 0
      ? Math.round(localAmount).toLocaleString("en-IN")
      : localAmount.toFixed(cfg.decimals);
  return {
    primary: `~${cfg.symbol}${formatted}`,
    usd,
    isLocalCurrency: true,
    currencyCode: cfg.code,
  };
}

export function normalizeCountryCode(code: string | null | undefined): string | null {
  const clean = code?.trim().toUpperCase();
  if (!clean || !/^[A-Z]{2}$/.test(clean) || clean === "XX" || clean === "T1") return null;
  return clean;
}

export function isCoveredCountryCode(code: string | null | undefined): boolean {
  const norm = normalizeCountryCode(code);
  return norm ? Boolean(COVERED_COUNTRY_CODES[norm]) : true;
}

export function countryDisplayName(code: string | null | undefined): string | null {
  const norm = normalizeCountryCode(code);
  if (!norm) return null;
  if (COVERED_COUNTRY_CODES[norm]) return COVERED_COUNTRY_CODES[norm];
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(norm) ?? norm;
  } catch {
    return norm;
  }
}

export function isPppCountry(code: string | null | undefined, customCsv?: string): boolean {
  const norm = normalizeCountryCode(code);
  if (!norm || !isCoveredCountryCode(norm)) return false;
  if (customCsv?.trim()) {
    const allowed = new Set(
      customCsv
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    );
    return allowed.has(norm);
  }
  return DEFAULT_PPP_COUNTRY_CODES.has(norm);
}

/**
 * Polar applies one discount per checkout.
 * Priority: active sale on that plan -> larger percentage between founding and PPP.
 */
export function pickBestDiscount(params: {
  plan: "monthly" | "quarterly" | "yearly";
  sale: { plan: string; discountId: string } | null;
  founding: { discountId: string; percentOff: number } | null;
  ppp: { discountId: string; percentOff: number } | null;
}): { discountId: string | null; kind: "sale" | "founding" | "ppp" | null } {
  if (params.sale && params.sale.plan === params.plan) {
    return { discountId: params.sale.discountId, kind: "sale" };
  }
  if (params.ppp && params.founding) {
    return params.ppp.percentOff >= params.founding.percentOff
      ? { discountId: params.ppp.discountId, kind: "ppp" }
      : { discountId: params.founding.discountId, kind: "founding" };
  }
  if (params.ppp) return { discountId: params.ppp.discountId, kind: "ppp" };
  if (params.founding) return { discountId: params.founding.discountId, kind: "founding" };
  return { discountId: null, kind: null };
}
