/**
 * WHERE DID THIS CUSTOMER COME FROM? - pure parts (also run in the proxy).
 *
 * Work-ly's growth goal is paying customers per channel, not traffic. That
 * needs one thing the app never had: the source of a visit carried all the
 * way to the payment. The proxy stores the first real source a browser
 * arrives with (utm_source, ?ref=, or the referring site) in a cookie; the
 * free check, signup, checkout and the paid order are then counted against
 * it. A later tagged visit replaces a "direct" first touch, never another
 * real source.
 */

export const ATTR_COOKIE = "wl_src";
export const ATTR_MAX_AGE_S = 90 * 24 * 60 * 60;

export interface Attribution {
  /** Source: "reddit", "producthunt", "linkedin", "google", "direct"... */
  s: string;
  /** Campaign (utm_campaign), e.g. "r-jobsearchhacks-oct". */
  c: string;
  /** Medium (utm_medium), e.g. "comment", "affiliate". */
  m: string;
  /** First page they landed on. */
  l: string;
  /** Day of the first touch, YYYY-MM-DD. */
  t: string;
}

/** Lowercase, safe for storage keys, bounded. */
export function clean(value: string | null | undefined, max = 40): string {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

/** Referring sites grouped into the channels that matter here. */
function sourceFromHost(host: string): string {
  const h = host.replace(/^www\./, "").replace(/^(m|old|l|lm|out)\./, "");
  if (/(^|\.)reddit\.com$|(^|\.)redd\.it$/.test(h)) return "reddit";
  if (/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/.test(h)) return "linkedin";
  if (/(^|\.)google\./.test(h)) return "google";
  if (/(^|\.)bing\.com$|duckduckgo\.com$|(^|\.)yahoo\./.test(h)) return "search";
  if (/(^|\.)producthunt\.com$/.test(h)) return "producthunt";
  if (/(^|\.)alternativeto\.net$/.test(h)) return "alternativeto";
  if (/news\.ycombinator\.com$/.test(h)) return "hackernews";
  if (/(^|\.)t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/.test(h)) return "x";
  if (/(^|\.)facebook\.com$|(^|\.)instagram\.com$/.test(h)) return "meta";
  if (/(^|\.)youtube\.com$|youtu\.be$/.test(h)) return "youtube";
  if (/(^|\.)chatgpt\.com$|(^|\.)openai\.com$|perplexity\.ai$|claude\.ai$|gemini\.google\.com$/.test(h)) return "ai-assistant";
  if (/mail\.|outlook\.|gmail\./.test(h)) return "email";
  return clean(h, 40) || "referral";
}

/**
 * The attribution a page view carries, or null when it isn't a first-party
 * navigation worth recording. Own-site referrers count as direct.
 */
export function attributionFromRequest(url: URL, referer: string | null, now = new Date()): Attribution {
  const p = url.searchParams;
  let s = clean(p.get("utm_source") ?? p.get("ref") ?? p.get("src"));
  if (!s && referer) {
    try {
      const host = new URL(referer).hostname.toLowerCase();
      const own = /(^|\.)work-ly\.in$/.test(host) || host === url.hostname.toLowerCase();
      if (!own) s = sourceFromHost(host);
    } catch {
      // unparseable referrer: treat as direct
    }
  }
  return {
    s: s || "direct",
    c: clean(p.get("utm_campaign")),
    m: clean(p.get("utm_medium")),
    l: url.pathname.slice(0, 80),
    t: now.toISOString().slice(0, 10),
  };
}

/** First real touch wins; a real source may replace a "direct" one. */
export function shouldStore(existing: Attribution | null, incoming: Attribution): boolean {
  if (!existing) return true;
  return existing.s === "direct" && incoming.s !== "direct";
}

/** Plain JSON: Next's cookie API URL-encodes the value itself when setting it. */
export function encodeAttribution(a: Attribution): string {
  return JSON.stringify(a);
}

export function decodeAttribution(raw: string | null | undefined): Attribution | null {
  if (!raw) return null;
  try {
    let v: Partial<Attribution>;
    try {
      v = JSON.parse(raw) as Partial<Attribution>;
    } catch {
      v = JSON.parse(decodeURIComponent(raw)) as Partial<Attribution>;
    }
    if (typeof v.s !== "string" || !v.s) return null;
    return {
      s: clean(v.s) || "direct",
      c: clean(v.c),
      m: clean(v.m),
      l: typeof v.l === "string" ? v.l.slice(0, 80) : "",
      t: typeof v.t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.t) ? v.t : "",
    };
  } catch {
    return null;
  }
}

/** "reddit / r-jobsearchhacks" - how a channel is shown in reports. */
export function channelLabel(source: string, campaign: string): string {
  return campaign ? `${source} / ${campaign}` : source;
}

export interface ChannelRow {
  channel: string;
  source: string;
  checks: number;
  signups: number;
  checkouts: number;
  paid: number;
  revenueCents: number;
}

export interface FunnelReport {
  sinceDay: string;
  rows: ChannelRow[];
  totals: Omit<ChannelRow, "channel" | "source">;
  /** New paying customers (orders) in the last 7 days - the primary KPI. */
  paidLast7: number;
  revenueLast7Cents: number;
}

/** Pure: aggregates stored funnel rows into a per-channel report. Exported for tests. */
export function buildFunnelReport(rows: { key: string; count: number }[], days: number, now = new Date()): FunnelReport {
  const since = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const week = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const byChannel = new Map<string, ChannelRow>();
  let paidLast7 = 0;
  let revenueLast7Cents = 0;

  for (const { key, count } of rows) {
    const [prefix, step, day, source, campaign] = key.split(":");
    if (prefix !== "funnel" || !day || !source) continue;
    if (day < since) continue;
    const camp = campaign === "none" ? "" : campaign ?? "";
    const id = channelLabel(source, camp);
    const row =
      byChannel.get(id) ??
      ({ channel: id, source, checks: 0, signups: 0, checkouts: 0, paid: 0, revenueCents: 0 } satisfies ChannelRow);
    if (step === "grader") row.checks += count;
    else if (step === "signup") row.signups += 1;
    else if (step === "checkout") row.checkouts += count;
    else if (step === "paid") {
      row.paid += 1;
      row.revenueCents += count;
      if (day >= week) {
        paidLast7 += 1;
        revenueLast7Cents += count;
      }
    }
    byChannel.set(id, row);
  }

  // Ranked by revenue, then paying customers - never by traffic.
  const sorted = [...byChannel.values()].sort(
    (a, b) => b.revenueCents - a.revenueCents || b.paid - a.paid || b.checkouts - a.checkouts || b.signups - a.signups || b.checks - a.checks,
  );
  const totals = sorted.reduce(
    (t, r) => ({
      checks: t.checks + r.checks,
      signups: t.signups + r.signups,
      checkouts: t.checkouts + r.checkouts,
      paid: t.paid + r.paid,
      revenueCents: t.revenueCents + r.revenueCents,
    }),
    { checks: 0, signups: 0, checkouts: 0, paid: 0, revenueCents: 0 },
  );
  return { sinceDay: since, rows: sorted, totals, paidLast7, revenueLast7Cents };
}
