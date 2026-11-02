/**
 * A SHAREABLE VERDICT - pure parts.
 *
 * "Work-ly told me to skip this job" is the kind of thing people post. The
 * card carries only what's safe to show anyone: the job's title and
 * company, the verdict, the score and up to four of the job's requirements
 * with a tick, half-tick or cross. Never a line of the resume, never a fix.
 *
 * There's no database row: the card's contents travel in the link itself,
 * signed by the server (lib/share/verdict-token.ts) so nobody can mint a
 * card Work-ly never gave.
 */

export const SHARE_RECS = ["APPLY_NOW", "APPLY", "STRETCH", "LOW_PRIORITY", "SKIP"] as const;
export type ShareRec = (typeof SHARE_RECS)[number];
export type ShareState = "met" | "partial" | "missing";

export interface SharedVerdict {
  /** Recommendation. */
  r: ShareRec;
  /** Fit score, or null when there wasn't enough to score. */
  s: number | null;
  /** Job title and company, when known. */
  t: string | null;
  c: string | null;
  /** Up to four requirements: text and state. */
  q: { x: string; k: ShareState }[];
  /** The sharer's account id, so the card doubles as their invite link. */
  i: string | null;
}

export const SHARE_COPY: Record<ShareRec, { word: string; brag: string; tone: "good" | "warn" | "bad" }> = {
  APPLY_NOW: { word: "Apply now.", brag: "Work-ly told me to apply now", tone: "good" },
  APPLY: { word: "Apply.", brag: "Work-ly told me to apply", tone: "good" },
  STRETCH: { word: "A stretch.", brag: "Work-ly says this job is a stretch for me", tone: "warn" },
  LOW_PRIORITY: { word: "Probably not.", brag: "Work-ly says I should probably skip this one", tone: "warn" },
  SKIP: { word: "Skip this one.", brag: "Work-ly told me to skip this job", tone: "bad" },
};

const clip = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

/** Validates and trims anything that claims to be a SharedVerdict. */
export function normalizeShared(raw: unknown): SharedVerdict | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!SHARE_RECS.includes(o.r as ShareRec)) return null;
  const s = typeof o.s === "number" && Number.isFinite(o.s) ? Math.max(0, Math.min(100, Math.round(o.s))) : null;
  const q = Array.isArray(o.q)
    ? o.q
        .map((row) => {
          const r = row as Record<string, unknown>;
          const x = clip(r?.x, 90);
          const k = r?.k === "met" || r?.k === "partial" || r?.k === "missing" ? (r.k as ShareState) : null;
          return x && k ? { x, k } : null;
        })
        .filter((row): row is { x: string; k: ShareState } => row !== null)
        .slice(0, 4)
    : [];
  const i = typeof o.i === "string" && /^[A-Za-z0-9-]{8,64}$/.test(o.i) ? o.i : null;
  return { r: o.r as ShareRec, s, t: clip(o.t, 80), c: clip(o.c, 60), q, i };
}

/**
 * Picks the rows worth showing: met ones first (that's the brag), then the
 * gaps, so a "Skip" card still shows why.
 */
export function pickRows(rows: { x: string; k: ShareState | "unknown" }[], max = 4): { x: string; k: ShareState }[] {
  const known = rows.filter((r): r is { x: string; k: ShareState } => r.k !== "unknown" && Boolean(r.x?.trim()));
  const order: Record<ShareState, number> = { met: 0, partial: 1, missing: 2 };
  const met = known.filter((r) => r.k === "met");
  const rest = known.filter((r) => r.k !== "met").sort((a, b) => order[a.k] - order[b.k]);
  // Leave room for at least one gap when there is one.
  const metShown = met.slice(0, rest.length > 0 ? max - 1 : max);
  return [...metShown, ...rest].slice(0, max);
}

/**
 * The card's font covers Latin text only. Anything else (Devanagari, emoji)
 * would make the image renderer fetch fonts from the internet mid-request,
 * and fail the whole picture if that fetch fails, so those characters are
 * left off the picture. The page itself shows the text in full.
 */
export function cardText(text: string | null): string | null {
  if (!text) return null;
  const kept = text
    .replace(/[^\u0000-\u00FF\u0131\u0152\u0153\u2000-\u206F\u20AC\u2122\u2212]/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return /[A-Za-z0-9]/.test(kept) ? kept : null;
}

/** Shortened at a word boundary to fit one line of the card ("…" when cut). */
export function cardClip(text: string | null, max: number): string | null {
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

/** "Work-ly told me to skip this job: Senior Cloud Engineer at Acme" */
export function shareTitle(v: SharedVerdict): string {
  const job = v.t ? `${v.t}${v.c ? ` at ${v.c}` : ""}` : null;
  return job ? `${SHARE_COPY[v.r].brag}: ${job}` : SHARE_COPY[v.r].brag;
}

/** Where the card's "check yours" button goes: the free check, carrying the sharer's invite. */
export function checkLink(v: SharedVerdict): string {
  return v.i ? `/?invite=${encodeURIComponent(v.i)}#check` : "/#check";
}

export function toBase64Url(json: string): string {
  return Buffer.from(json, "utf8").toString("base64url");
}

export function fromBase64Url(b64: string): string | null {
  try {
    return Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
