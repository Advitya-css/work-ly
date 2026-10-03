/**
 * HOW DID THIS PERSON GET PRO? - pure, so it can be tested.
 *
 * Pieced together from what the app already stores, no migration:
 *   users."proPlan"            monthly / quarterly / yearly (a Pro plan), sprint, seat, beta, trial
 *   beta_codes."usedByUserId"  the code they redeemed, if any (TEAM-..#003 = a seat on TEAM-..)
 *   refund_first_<userId>      written on their first paid Polar order
 */

export type ProSourceKind = "paid" | "sprint" | "seat" | "gift" | "code" | "trial" | "unknown" | "expired" | "free";

export interface ProSourceInput {
  isPro: boolean;
  proPlan: string | null;
  proUntil: Date | string | null;
  /** The last code this person redeemed (a beta_codes row). */
  codeUsed: string | null;
  /** Has a paid Polar order on record. */
  hasPaid: boolean;
}

export interface ProSource {
  kind: ProSourceKind;
  /** Short, for the table: "Paid · 3-Month Pass". */
  label: string;
  /** The code or the end date. */
  detail: string | null;
}

const PLAN_NAMES: Record<string, string> = { monthly: "Monthly", quarterly: "3-Month Pass", yearly: "Yearly Pass" };

function day(value: Date | string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** "TEAM-AB12CD34#003" -> "TEAM-AB12CD34" */
export function groupOf(code: string): string {
  const i = code.indexOf("#");
  return i === -1 ? code : code.slice(0, i);
}

export function proSource(input: ProSourceInput, now = new Date()): ProSource {
  const until = input.proUntil ? new Date(input.proUntil) : null;
  const active = input.isPro && (!until || until.getTime() > now.getTime());
  const ends = day(input.proUntil);
  const endsText = ends ? `until ${ends}` : null;
  const code = input.codeUsed ? groupOf(input.codeUsed) : null;

  if (!active) {
    if (input.hasPaid) return { kind: "expired", label: "Paid before, Pro ended", detail: ends ? `ended ${ends}` : null };
    if (input.isPro) return { kind: "expired", label: "Pro ended", detail: ends ? `ended ${ends}` : null };
    return { kind: "free", label: "Free", detail: null };
  }

  const plan = input.proPlan ?? "";
  if (plan in PLAN_NAMES) {
    return input.hasPaid
      ? { kind: "paid", label: `Paid · ${PLAN_NAMES[plan]}`, detail: endsText }
      : { kind: "unknown", label: `${PLAN_NAMES[plan]} (no payment on record)`, detail: endsText };
  }
  if (plan === "sprint") return { kind: "sprint", label: "Paid · Application Sprint", detail: endsText };
  if (plan === "trial") return { kind: "trial", label: "1-day trial", detail: endsText };
  if (plan === "seat") {
    if (code?.startsWith("GIFT-")) return { kind: "gift", label: "Gift pass", detail: code };
    if (code?.startsWith("PASS-")) return { kind: "code", label: "Free pass from you", detail: code };
    return { kind: "seat", label: "Seat code (coach or cohort)", detail: code ?? endsText };
  }
  if (plan === "beta") {
    return code
      ? { kind: "code", label: "Beta code", detail: code }
      : { kind: "code", label: "Universal code (e.g. REDDITPRO)", detail: endsText };
  }
  if (input.hasPaid) return { kind: "paid", label: "Paid", detail: endsText };
  if (code) return { kind: "code", label: "Code", detail: code };
  return { kind: "unknown", label: "Unknown (given before tracking)", detail: endsText };
}

export const PRO_SOURCE_ORDER: ProSourceKind[] = ["paid", "sprint", "seat", "gift", "code", "trial", "unknown", "expired"];

export const PRO_SOURCE_TITLE: Record<ProSourceKind, string> = {
  paid: "Paid for a plan",
  sprint: "Paid for a Sprint",
  seat: "Seat code (coach or cohort)",
  gift: "Gift pass",
  code: "Free code (beta, universal or from you)",
  trial: "1-day trial",
  unknown: "Unknown (given before tracking)",
  expired: "Had Pro, now ended",
  free: "Free",
};
